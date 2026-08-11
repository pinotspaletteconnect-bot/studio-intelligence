"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { z } from "zod"

import { getAuthenticatedUser, getUserAccessContext } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase/server"
import { CURRENT_TERMS } from "@/lib/legal/documents"
import { recordCurrentLegalAcceptance } from "@/lib/services/legal-consent"

export type OnboardingState = { error?: string } | undefined

const onboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  password: z.string().max(72),
  confirmation: z.string().max(72),
  acceptTerms: z.literal("on"),
  acceptPrivacy: z.literal("on"),
  benchmarkConsent: z.enum(["on"]).optional(),
})

export async function completeOnboarding(
  _previousState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const [user, context] = await Promise.all([
    getAuthenticatedUser(),
    getUserAccessContext(),
  ])
  if (!user || !context) return { error: "Your invitation could not be verified." }

  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    password: String(formData.get("password") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
    acceptTerms: formData.get("acceptTerms"),
    acceptPrivacy: formData.get("acceptPrivacy"),
    benchmarkConsent: formData.get("benchmarkConsent") ?? undefined,
  })
  if (!parsed.success) return { error: "Complete the required account information." }
  const passwordAlreadyCreated = Boolean(user.app_metadata?.onboarding_password_created_at)
  if (!passwordAlreadyCreated && (parsed.data.password.length < 12 || parsed.data.password !== parsed.data.confirmation)) {
    return { error: parsed.data.password !== parsed.data.confirmation ? "Passwords do not match." : "Use a password with at least 12 characters." }
  }

  const now = new Date().toISOString()
  if (!passwordAlreadyCreated) {
    const { error: passwordError } = await supabase.auth.admin.updateUserById(user.id, {
      password: parsed.data.password,
      app_metadata: {
        ...user.app_metadata,
        onboarding_password_created_at: now,
        temporary_password_must_change: false,
        temporary_password_changed_at: now,
      },
    })
    if (passwordError && passwordError.code !== "same_password") {
      console.error("Invited user password setup failed", {
        code: passwordError.code,
        status: passwordError.status,
        userId: user.id,
      })
      return { error: "Your password could not be created. Please try again." }
    }
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert({
    user_id: user.id,
    full_name: parsed.data.fullName,
    terms_version: CURRENT_TERMS.version,
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

  const requestHeaders = await headers()
  try {
    await recordCurrentLegalAcceptance({
      userId: user.id,
      organizationId: context.organizationId,
      method: "onboarding",
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip"),
      userAgent: requestHeaders.get("user-agent"),
    })
  } catch (error) {
    console.error("Legal acceptance could not be recorded", { error, userId: user.id })
    return { error: "Your legal acceptance could not be recorded. Please try again." }
  }

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
