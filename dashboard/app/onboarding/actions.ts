"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { getAuthenticatedUser, getUserAccessContext } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase/server"

export type OnboardingState = { error?: string } | undefined

const onboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  acceptTerms: z.literal("on"),
  benchmarkConsent: z.enum(["on"]).optional(),
})

export async function completeOnboarding(
  _previousState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    acceptTerms: formData.get("acceptTerms"),
    benchmarkConsent: formData.get("benchmarkConsent") ?? undefined,
  })
  if (!parsed.success) return { error: "Complete the required account information." }

  const [user, context] = await Promise.all([
    getAuthenticatedUser(),
    getUserAccessContext(),
  ])
  if (!user || !context) return { error: "Your invitation could not be verified." }

  const now = new Date().toISOString()
  const { error: profileError } = await supabase.from("user_profiles").upsert({
    user_id: user.id,
    full_name: parsed.data.fullName,
    terms_version: "1.0",
    terms_accepted_at: now,
    onboarding_completed_at: now,
    updated_at: now,
  })
  if (profileError) return { error: "Your profile could not be saved." }

  const { error: membershipError } = await supabase
    .from("organization_memberships")
    .update({ status: "active", joined_at: now, updated_at: now })
    .eq("organization_id", context.organizationId)
    .eq("user_id", user.id)
  if (membershipError) return { error: "Your organization access could not be activated." }

  if (["owner", "administrator"].includes(context.role)) {
    const optedIn = parsed.data.benchmarkConsent === "on"
    const { error: consentError } = await supabase
      .from("benchmark_participation_settings")
      .upsert({
        organization_id: context.organizationId,
        opted_in: optedIn,
        consent_version: "1.0",
        consented_by: user.id,
        consented_at: optedIn ? now : null,
        withdrawn_at: null,
        updated_at: now,
      })
    if (consentError) return { error: "Your privacy preference could not be saved." }
  }

  redirect("/dashboard")
}
