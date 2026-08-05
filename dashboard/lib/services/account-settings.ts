import "server-only"

import { supabase } from "@/lib/supabase/server"

export async function getAccountSettings(
  organizationId: number,
  allowedStudioIds: number[]
) {
  const [membershipResult, studioResult, integrationResult, brandResult, ptsAccountResult] =
    await Promise.all([
      supabase
        .from("organization_memberships")
        .select("user_id,role,status,joined_at,created_at")
        .eq("organization_id", organizationId)
        .in("status", ["invited", "active"])
        .order("created_at"),
      supabase
        .from("studios")
        .select("id,studio_name")
        .eq("organization_id", organizationId)
        .in("id", allowedStudioIds)
        .order("studio_name"),
      supabase
        .from("integration_secret_references")
        .select(
          "id,studio_id,integration_type,account_label,secret_provider,connection_status,last_validated_at"
        )
        .eq("organization_id", organizationId)
        .order("account_label"),
      supabase
        .from("brands")
        .select("id,name")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase
        .from("pts_integration_accounts")
        .select("id,account_name,secret_provider,secret_reference,is_active,last_validated_at")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("account_name"),
    ])

  for (const result of [membershipResult, studioResult, integrationResult, brandResult, ptsAccountResult]) {
    if (result.error) throw result.error
  }

  const memberIds = (membershipResult.data ?? []).map((membership) => membership.user_id)
  const profileResult = memberIds.length
    ? await supabase
        .from("user_profiles")
        .select("user_id,full_name")
        .in("user_id", memberIds)
    : { data: [], error: null }
  if (profileResult.error) throw profileResult.error

  const profiles = new Map(
    (profileResult.data ?? []).map((profile) => [profile.user_id, profile.full_name])
  )

  const [authUsers, studioAccessResult] = await Promise.all([
    Promise.all(
      memberIds.map(async (userId) => {
        const { data, error } = await supabase.auth.admin.getUserById(userId)
        if (error) throw error
        return [userId, data.user.email ?? ""] as const
      })
    ),
    memberIds.length
      ? supabase
          .from("user_studio_access")
          .select("user_id,studio_id")
          .eq("organization_id", organizationId)
          .in("user_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (studioAccessResult.error) throw studioAccessResult.error

  const emails = new Map(authUsers)
  const studioIdsByUser = new Map<string, number[]>()
  for (const grant of studioAccessResult.data ?? []) {
    const studioIds = studioIdsByUser.get(grant.user_id) ?? []
    studioIds.push(grant.studio_id)
    studioIdsByUser.set(grant.user_id, studioIds)
  }

  return {
    members: (membershipResult.data ?? []).map((membership) => ({
      ...membership,
      name: profiles.get(membership.user_id) ?? "Invited user",
      email: emails.get(membership.user_id) ?? "",
      studioIds: studioIdsByUser.get(membership.user_id) ?? [],
    })),
    studios: studioResult.data ?? [],
    integrations: integrationResult.data ?? [],
    brands: brandResult.data ?? [],
    ptsAccounts: ptsAccountResult.data ?? [],
  }
}
