"use server"

import { redirect } from "next/navigation"

import { createAuthClient } from "@/lib/supabase/auth-server"
import { SESSION_ACTIVITY_COOKIE } from "@/lib/auth/session-policy"
import { cookies } from "next/headers"

export async function logout() {
  const auth = await createAuthClient()
  await auth.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.set(SESSION_ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 })
  redirect("/login")
}
