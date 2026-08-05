"use server"

import { redirect } from "next/navigation"

import { createAuthClient } from "@/lib/supabase/auth-server"

export async function logout() {
  const auth = await createAuthClient()
  await auth.auth.signOut()
  redirect("/login")
}
