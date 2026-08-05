"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createAuthClient } from "@/lib/supabase/auth-server"
import { supabase } from "@/lib/supabase/server"

export type UpdatePasswordState = { error?: string } | undefined

const passwordSchema = z
  .object({
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
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Use a stronger password." }
  }

  const auth = await createAuthClient()
  const { data } = await auth.auth.getUser()
  if (!data.user) return { error: "The reset link is invalid or has expired." }

  // The recovery access token can be refreshed or replaced after the user signs
  // in, which makes auth.updateUser() unreliable on this page even though the
  // server can still verify the authenticated user. Use the server-only admin
  // client after that verification and scope the mutation to the verified ID.
  const { error } = await supabase.auth.admin.updateUserById(data.user.id, {
    password: parsed.data.password,
  })
  if (error) {
    console.error("Unable to update authenticated user password", {
      code: error.code,
      status: error.status,
      userId: data.user.id,
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
