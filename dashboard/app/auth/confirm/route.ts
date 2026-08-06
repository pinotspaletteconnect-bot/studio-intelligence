import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabasePublicConfig } from "@/lib/supabase/config"

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
    const response = NextResponse.redirect(redirectTo)
    const { url, publishableKey } = getSupabasePublicConfig()
    const auth = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    })
    const { error } = await auth.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return response
  }

  redirectTo.pathname = "/login"
  redirectTo.searchParams.set("error", "invalid_link")
  return NextResponse.redirect(redirectTo)
}
