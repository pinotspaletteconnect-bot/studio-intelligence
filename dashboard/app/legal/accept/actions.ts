"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getUserAccessContext } from "@/lib/auth/session"
import { recordCurrentLegalAcceptance } from "@/lib/services/legal-consent"

export type LegalAcceptanceState = { error?: string } | undefined

const acceptanceSchema = z.object({ acceptTerms: z.literal("on"), acceptPrivacy: z.literal("on") })

export async function acceptCurrentLegalDocuments(_state: LegalAcceptanceState, formData: FormData): Promise<LegalAcceptanceState> {
  const context = await getUserAccessContext()
  if (!context || !context.onboardingComplete) return { error: "Your account could not be verified." }
  const parsed = acceptanceSchema.safeParse({ acceptTerms: formData.get("acceptTerms"), acceptPrivacy: formData.get("acceptPrivacy") })
  if (!parsed.success) return { error: "Accept both documents to continue." }

  const requestHeaders = await headers()
  try {
    await recordCurrentLegalAcceptance({
      userId: context.userId,
      organizationId: context.organizationId,
      method: "policy_update",
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip"),
      userAgent: requestHeaders.get("user-agent"),
    })
  } catch (error) {
    console.error("Updated legal acceptance could not be recorded", { error, userId: context.userId })
    return { error: "Your acceptance could not be recorded. Please try again." }
  }
  redirect("/dashboard")
}
