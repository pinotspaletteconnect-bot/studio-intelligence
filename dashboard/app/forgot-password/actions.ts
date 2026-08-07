"use server"

import { headers } from "next/headers"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { createRecoveryEmailClient } from "@/lib/supabase/recovery-server"

export type ResetRequestState = { complete?: boolean; error?: string } | undefined

export async function requestPasswordReset(
  _previousState: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const parsed = z.email().max(254).safeParse(formData.get("email"))
  if (!parsed.success) return { error: "Enter a valid email address." }

  let origin: string
  try {
    origin = getTrustedAppOrigin((await headers()).get("origin"))
  } catch (error) {
    console.error("Password reset origin is not configured", error)
    return { error: "Password reset is temporarily unavailable." }
  }

  const auth = createRecoveryEmailClient()
  await auth.auth.resetPasswordForEmail(parsed.data.trim().toLowerCase(), {
    redirectTo: `${origin}/reset-password`,
  })

  // Never disclose whether an email address belongs to an account.
  return { complete: true }
}
