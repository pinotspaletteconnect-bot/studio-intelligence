"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createAuthClient } from "@/lib/supabase/auth-server"
import {
  mustChangeTemporaryPassword,
  temporaryPasswordExpired,
} from "@/lib/auth/temporary-password"

export type LoginState = { error?: string } | undefined

const loginSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(1024),
})

export async function login(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) return { error: "Enter a valid email and password." }

  const auth = await createAuthClient()
  const { data, error } = await auth.auth.signInWithPassword(parsed.data)

  if (error) return { error: "The email or password is incorrect." }
  if (data.user && mustChangeTemporaryPassword(data.user.app_metadata)) {
    if (temporaryPasswordExpired(data.user.app_metadata)) {
      await auth.auth.signOut()
      return { error: "This temporary password has expired. Ask your administrator to issue a new one." }
    }
    redirect("/reset-password")
  }
  redirect("/dashboard")
}
