import { NextResponse } from "next/server"
import { z } from "zod"

import { requireDashboardContext } from "@/lib/auth/session"
import { ga4OauthClient, readGa4OauthState } from "@/lib/integrations/ga4-oauth"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), token_type: z.string().optional(), expires_in: z.number().optional() })
const userSchema = z.object({ email: z.email() })

function settingsRedirect(origin: string, result: string) {
  return NextResponse.redirect(new URL(`/settings?ga4=${encodeURIComponent(result)}#ga4-connections`, origin))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get("error")) return settingsRedirect(url.origin, "cancelled")
  try {
    const access = await requireDashboardContext()
    const state = readGa4OauthState(url.searchParams.get("state") ?? "")
    if (state.userId !== access.userId || state.organizationId !== access.organizationId || !["owner", "administrator"].includes(access.role)) {
      return settingsRedirect(url.origin, "unauthorized")
    }
    const code = url.searchParams.get("code")
    if (!code) return settingsRedirect(url.origin, "missing-code")
    const { clientId, clientSecret } = ga4OauthClient()
    const redirectUri = `${url.origin}/api/integrations/ga4/callback`
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      signal: AbortSignal.timeout(15000),
    })
    if (!tokenResponse.ok) throw new Error(`Google token exchange failed (${tokenResponse.status})`)
    const tokens = tokenSchema.parse(await tokenResponse.json())
    const [userResponse, accountResponse] = await Promise.all([
      fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15000) }),
      fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", { headers: { authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(30000) }),
    ])
    if (!userResponse.ok || !accountResponse.ok) throw new Error("Google Analytics account discovery failed")
    const user = userSchema.parse(await userResponse.json())
    const summaries = await accountResponse.json() as { accountSummaries?: Array<{ displayName?: string; propertySummaries?: Array<{ property?: string; displayName?: string }> }> }
    const properties = (summaries.accountSummaries ?? []).flatMap(account => (account.propertySummaries ?? []).map(property => ({
      propertyId: String(property.property ?? "").replace(/^properties\//, ""),
      displayName: property.displayName ?? "",
      accountDisplayName: account.displayName ?? "",
    }))).filter(property => /^\d+$/.test(property.propertyId) && property.displayName)

    const { data: accountId, error: createError } = await supabase.rpc("create_ga4_oauth_account_with_secret", {
      p_organization_id: access.organizationId,
      p_account_name: state.accountName,
      p_google_account_email: user.email,
      p_oauth_credentials: { refresh_token: tokens.refresh_token, client_id: clientId, client_secret: clientSecret, token_uri: "https://oauth2.googleapis.com/token" },
    })
    if (createError || !accountId) throw createError ?? new Error("GA4 account creation failed")
    const { error: syncError } = await supabase.rpc("sync_ga4_properties", { p_account_id: accountId, p_properties: properties })
    if (syncError) throw syncError
    return settingsRedirect(url.origin, "connected")
  } catch (error) {
    console.error("GA4 OAuth callback failed", { message: error instanceof Error ? error.message : "Unknown error" })
    return settingsRedirect(url.origin, "failed")
  }
}
