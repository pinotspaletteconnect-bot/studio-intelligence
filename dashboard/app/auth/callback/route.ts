import { NextResponse, type NextRequest } from "next/server"

import { createAuthClient } from "@/lib/supabase/auth-server"

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = safeNext(request.nextUrl.searchParams.get("next"))

  if (code) {
    const auth = await createAuthClient()
    const { error } = await auth.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url))
}
