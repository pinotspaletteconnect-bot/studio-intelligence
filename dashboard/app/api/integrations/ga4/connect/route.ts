import { NextResponse } from "next/server"
import { z } from "zod"

import { requireDashboardContext } from "@/lib/auth/session"
import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { createGa4OauthState, ga4OauthClient } from "@/lib/integrations/ga4-oauth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) {
    return NextResponse.json({ error: "Only an owner or administrator can connect GA4." }, { status: 403 })
  }
  const url = new URL(request.url)
  const appOrigin = getTrustedAppOrigin(url.origin)
  const parsed = z.string().trim().min(2).max(120).safeParse(url.searchParams.get("accountName"))
  if (!parsed.success) return NextResponse.redirect(new URL("/settings?ga4=invalid-label", appOrigin))

  const { clientId } = ga4OauthClient()
  const redirectUri = `${appOrigin}/api/integrations/ga4/callback`
  const state = createGa4OauthState({ organizationId: access.organizationId, userId: access.userId, accountName: parsed.data })
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    scope: "openid email https://www.googleapis.com/auth/analytics.readonly",
    state,
  }).toString()
  return NextResponse.redirect(authorize)
}
