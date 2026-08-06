import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabasePublicConfig } from "@/lib/supabase/config"

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = safeNext(request.nextUrl.searchParams.get("next"))

  if (code) {
    const response = NextResponse.redirect(new URL(next, request.url))
    const { url, publishableKey } = getSupabasePublicConfig()
    const auth = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    })
    const { error } = await auth.auth.exchangeCodeForSession(code)
    if (!error) return response
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url))
}
