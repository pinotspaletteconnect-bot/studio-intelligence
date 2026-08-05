"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createAuthClient } from "@/lib/supabase/auth-server"

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
  const { error } = await auth.auth.signInWithPassword(parsed.data)

  if (error) return { error: "The email or password is incorrect." }
  redirect("/dashboard")
}
