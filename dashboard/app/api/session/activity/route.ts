import { NextResponse } from "next/server"

import {
  activityCookieOptions,
  createActivityCookieValue,
  SESSION_ABSOLUTE_LIMIT_MS,
  SESSION_ACTIVITY_COOKIE,
} from "@/lib/auth/session-policy"
import { createAuthClient } from "@/lib/supabase/auth-server"

export async function POST() {
  const auth = await createAuthClient()
  const { data, error } = await auth.auth.getUser()
  const signedInAt = data.user?.last_sign_in_at ? Date.parse(data.user.last_sign_in_at) : Number.NaN

  if (error || !data.user || !Number.isFinite(signedInAt) || Date.now() - signedInAt >= SESSION_ABSOLUTE_LIMIT_MS) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 })
  }

  const response = NextResponse.json({ active: true })
  response.cookies.set(SESSION_ACTIVITY_COOKIE, await createActivityCookieValue(), activityCookieOptions)
  return response
}
