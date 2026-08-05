import { NextResponse } from "next/server"

import { SESSION_ACTIVITY_COOKIE } from "@/lib/auth/session-policy"
import { createAuthClient } from "@/lib/supabase/auth-server"

export async function POST() {
  const auth = await createAuthClient()
  await auth.auth.signOut()
  const response = NextResponse.json({ signedOut: true })
  response.cookies.set(SESSION_ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 })
  return response
}
