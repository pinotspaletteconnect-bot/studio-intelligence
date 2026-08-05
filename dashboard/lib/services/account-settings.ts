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

  return {
    members: (membershipResult.data ?? []).map((membership) => ({
      ...membership,
      name: profiles.get(membership.user_id) ?? "Invited user",
    })),
    studios: studioResult.data ?? [],
    integrations: integrationResult.data ?? [],
    brands: brandResult.data ?? [],
    ptsAccounts: ptsAccountResult.data ?? [],
  }
}
