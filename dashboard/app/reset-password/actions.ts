"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createAuthClient } from "@/lib/supabase/auth-server"

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

  const { error } = await auth.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: "The password could not be updated." }

  redirect("/dashboard")
}
