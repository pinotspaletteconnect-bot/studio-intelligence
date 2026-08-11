import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createAuthClient } from "@/lib/supabase/auth-server"
import { supabase } from "@/lib/supabase/server"
import { mustChangeTemporaryPassword } from "@/lib/auth/temporary-password"
import { hasCurrentLegalAcceptance } from "@/lib/services/legal-consent"

export type OrganizationRole = "owner" | "administrator" | "manager" | "viewer"

export type UserAccessContext = {
  userId: string
  email: string
  fullName: string | null
  onboardingComplete: boolean
  legalAccepted: boolean
  organizationId: number
  role: OrganizationRole
  allowedStudioIds: number[]
}

export const getAuthenticatedUser = cache(async () => {
  const auth = await createAuthClient()
  const { data, error } = await auth.auth.getUser()

  if (error || !data.user) return null
  return data.user
})

export const getUserAccessContext = cache(async (): Promise<UserAccessContext | null> => {
  const user = await getAuthenticatedUser()
  if (!user) return null

  const [{ data: memberships, error: membershipError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from("organization_memberships")
        .select("organization_id,role,status")
        .eq("user_id", user.id)
        .in("status", ["invited", "active"])
        .order("created_at")
        .limit(1),
      supabase
        .from("user_profiles")
        .select("full_name,onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ])

  if (membershipError || profileError) {
    console.error("Unable to resolve authenticated tenant access", {
      membershipError,
      profileError,
      userId: user.id,
    })
    throw new Error("Unable to verify account access.")
  }

  const membership = memberships?.[0]
  if (!membership) return null

  const legalAccepted = await hasCurrentLegalAcceptance(user.id, membership.organization_id)

  let studioQuery = supabase
    .from("studios")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .eq("active", true)

  if (!(["owner", "administrator"] as string[]).includes(membership.role)) {
    const { data: grants, error: grantError } = await supabase
      .from("user_studio_access")
      .select("studio_id")
      .eq("organization_id", membership.organization_id)
      .eq("user_id", user.id)

    if (grantError) throw new Error("Unable to verify studio access.")
    const grantedStudioIds = (grants ?? []).map((grant) => grant.studio_id)
    if (grantedStudioIds.length === 0) {
      return {
        userId: user.id,
        email: user.email ?? "",
        fullName: profile?.full_name ?? null,
        onboardingComplete:
          membership.status === "active" && Boolean(profile?.onboarding_completed_at),
        legalAccepted,
        organizationId: membership.organization_id,
        role: membership.role as OrganizationRole,
        allowedStudioIds: [],
      }
    }
    studioQuery = studioQuery.in("id", grantedStudioIds)
  }

  const { data: studios, error: studioError } = await studioQuery
  if (studioError) throw new Error("Unable to verify studio access.")

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? null,
    onboardingComplete:
      membership.status === "active" && Boolean(profile?.onboarding_completed_at),
    legalAccepted,
    organizationId: membership.organization_id,
    role: membership.role as OrganizationRole,
    allowedStudioIds: (studios ?? []).map((studio) => studio.id),
  }
})

export async function requireDashboardContext() {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/login")
  if (mustChangeTemporaryPassword(user.app_metadata)) redirect("/reset-password")

  const context = await getUserAccessContext()
  if (!context) redirect("/access-pending")
  if (!context.onboardingComplete) redirect("/onboarding")
  if (!context.legalAccepted) redirect("/legal/accept")

  return context
}

export async function requireOnboardingContext() {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/login")
  if (mustChangeTemporaryPassword(user.app_metadata)) redirect("/reset-password")

  const context = await getUserAccessContext()
  if (!context) redirect("/access-pending")
  if (context.onboardingComplete) redirect(context.legalAccepted ? "/dashboard" : "/legal/accept")

  return context
}

export async function requireLegalAcceptanceContext() {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/login")
  if (mustChangeTemporaryPassword(user.app_metadata)) redirect("/reset-password")
  const context = await getUserAccessContext()
  if (!context) redirect("/access-pending")
  if (!context.onboardingComplete) redirect("/onboarding")
  if (context.legalAccepted) redirect("/dashboard")
  return context
}
