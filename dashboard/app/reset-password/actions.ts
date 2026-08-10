"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createAuthClient } from "@/lib/supabase/auth-server"
import { supabase } from "@/lib/supabase/server"
import { temporaryPasswordExpired } from "@/lib/auth/temporary-password"

export type UpdatePasswordState = { error?: string } | undefined

const passwordSchema = z
  .object({
    email: z.union([z.literal(""), z.email().max(254)]),
    currentPassword: z.string().max(1024),
    password: z.string().min(12).max(72),
    confirmation: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmation, {
    message: "Passwords do not match.",
    path: ["confirmation"],
  })

export async function updatePassword(
  _previousState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const parsed = passwordSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    currentPassword: String(formData.get("currentPassword") ?? ""),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Use a stronger password." }
  }

  const auth = await createAuthClient()
  const { data } = await auth.auth.getUser()
  let user = data.user

  if (!user) {
    if (!parsed.data.email || !parsed.data.currentPassword) {
      return {
        error:
          "Your session has expired. Enter your email and current or temporary password.",
      }
    }

    const { data: signInData, error: signInError } =
      await auth.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.currentPassword,
      })
    if (signInError || !signInData.user) {
      return { error: "The email or current password is incorrect." }
    }
    user = signInData.user
  }

  if (temporaryPasswordExpired(user.app_metadata)) {
    await auth.auth.signOut()
    return { error: "This temporary password has expired. Ask your administrator to issue a new one." }
  }

  // The recovery access token can be refreshed or replaced after the user signs
  // in, which makes auth.updateUser() unreliable on this page even though the
  // server can still verify the authenticated user. Use the server-only admin
  // client after that verification and scope the mutation to the verified ID.
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
    app_metadata: {
      ...user.app_metadata,
      onboarding_password_created_at: new Date().toISOString(),
      temporary_password_must_change: false,
      temporary_password_changed_at: new Date().toISOString(),
    },
  })
  if (error) {
    console.error("Unable to update authenticated user password", {
      code: error.code,
      status: error.status,
      userId: user.id,
    })
    return {
      error:
        error.code === "same_password"
          ? "Choose a password you have not used for this account."
          : "The password could not be updated. Please try again.",
    }
  }

  redirect("/dashboard")
}
