import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { createAuthClient } from "@/lib/supabase/auth-server"

function safeNext(value: string | null, type: EmailOtpType | null) {
  if (value?.startsWith("/") && !value.startsWith("//")) return value
  return type === "recovery" ? "/reset-password" : "/onboarding"
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = safeNext(request.nextUrl.searchParams.get("next"), type)
  redirectTo.search = ""

  if (tokenHash && type) {
    const auth = await createAuthClient()
    const { error } = await auth.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(redirectTo)
  }

  redirectTo.pathname = "/login"
  redirectTo.searchParams.set("error", "invalid_link")
  return NextResponse.redirect(redirectTo)
}
