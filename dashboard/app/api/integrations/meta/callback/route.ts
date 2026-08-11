import { NextResponse } from "next/server"
import { z } from "zod"

import { requireDashboardContext } from "@/lib/auth/session"
import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { metaOauthClient, readMetaOauthState } from "@/lib/integrations/meta-oauth"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const tokenSchema = z.object({ access_token: z.string().min(1), token_type: z.string().optional(), expires_in: z.number().optional() })
const userSchema = z.object({ id: z.string().regex(/^\d+$/), name: z.string().min(1) })
type GraphList<T> = { data?: T[] }

function settingsRedirect(origin: string, result: string) { return NextResponse.redirect(new URL(`/settings?meta=${encodeURIComponent(result)}#meta-connections`, origin)) }
function epochDate(value: unknown) { return typeof value === "number" && value > 0 ? new Date(value * 1000).toISOString() : null }

export async function GET(request: Request) {
  const url = new URL(request.url)
  const appOrigin = getTrustedAppOrigin(url.origin)
  if (url.searchParams.get("error")) return settingsRedirect(appOrigin, "cancelled")
  try {
    const access = await requireDashboardContext()
    const state = readMetaOauthState(url.searchParams.get("state") ?? "")
    if (state.userId !== access.userId || state.organizationId !== access.organizationId || !["owner", "administrator"].includes(access.role)) return settingsRedirect(appOrigin, "unauthorized")
    const code = url.searchParams.get("code")
    if (!code) return settingsRedirect(appOrigin, "missing-code")
    const { appId, appSecret, graphVersion } = metaOauthClient()
    const redirectUri = `${appOrigin}/api/integrations/meta/callback`
    const shortUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`)
    shortUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString()
    const shortResponse = await fetch(shortUrl, { signal: AbortSignal.timeout(15000) })
    if (!shortResponse.ok) throw new Error(`Meta authorization exchange failed (${shortResponse.status})`)
    const shortToken = tokenSchema.parse(await shortResponse.json())
    const longUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`)
    longUrl.search = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken.access_token }).toString()
    const longResponse = await fetch(longUrl, { signal: AbortSignal.timeout(15000) })
    if (!longResponse.ok) throw new Error(`Meta long-lived token exchange failed (${longResponse.status})`)
    const longToken = tokenSchema.parse(await longResponse.json())
    const graph = async <T,>(path: string) => {
      const endpoint = new URL(`https://graph.facebook.com/${graphVersion}${path}`)
      endpoint.searchParams.set("access_token", longToken.access_token)
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(30000) })
      if (!response.ok) throw new Error(`Meta asset discovery failed (${response.status})`)
      return await response.json() as T
    }
    const debugUrl = new URL(`https://graph.facebook.com/${graphVersion}/debug_token`)
    debugUrl.search = new URLSearchParams({ input_token: longToken.access_token, access_token: `${appId}|${appSecret}` }).toString()
    const [user, businesses, adAccounts, pages, debugResponse] = await Promise.all([
      graph<{ id: string; name: string }>("/me?fields=id,name"),
      graph<GraphList<{ id: string; name: string }>>("/me/businesses?fields=id,name&limit=200"),
      graph<GraphList<{ id: string; name: string; account_status?: number; currency?: string; timezone_name?: string }>>("/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=200"),
      graph<GraphList<{ id: string; name: string; instagram_business_account?: { id: string; name?: string; username?: string } }>>("/me/accounts?fields=id,name,instagram_business_account{id,name,username}&limit=200"),
      fetch(debugUrl, { signal: AbortSignal.timeout(15000) }),
    ])
    const tokenInfo = debugResponse.ok ? await debugResponse.json() as { data?: { expires_at?: number; data_access_expires_at?: number } } : {}
    const parsedUser = userSchema.parse(user)
    const assets = [
      ...(businesses.data ?? []).map(item => ({ assetType: "business", assetId: item.id, displayName: item.name, metadata: {} })),
      ...(adAccounts.data ?? []).map(item => ({ assetType: "ad_account", assetId: item.id, displayName: item.name, metadata: { accountStatus: item.account_status, currency: item.currency, timezone: item.timezone_name } })),
      ...(pages.data ?? []).map(item => ({ assetType: "page", assetId: item.id, displayName: item.name, metadata: {} })),
      ...(pages.data ?? []).flatMap(page => page.instagram_business_account ? [{ assetType: "instagram_account", assetId: page.instagram_business_account.id, displayName: page.instagram_business_account.username ? `@${page.instagram_business_account.username}` : (page.instagram_business_account.name ?? `${page.name} Instagram`), metadata: { pageId: page.id } }] : []),
    ]
    const { data: accountId, error: createError } = await supabase.rpc("create_meta_oauth_account_with_secret", {
      p_organization_id: access.organizationId, p_account_name: state.accountName,
      p_meta_user_id: parsedUser.id, p_meta_user_name: parsedUser.name,
      p_oauth_credentials: { access_token: longToken.access_token, token_type: longToken.token_type ?? "bearer" },
      p_token_expires_at: epochDate(tokenInfo.data?.expires_at) ?? (longToken.expires_in ? new Date(Date.now() + longToken.expires_in * 1000).toISOString() : null),
      p_data_access_expires_at: epochDate(tokenInfo.data?.data_access_expires_at),
    })
    if (createError || !accountId) throw createError ?? new Error("Meta account creation failed")
    const { error: syncError } = await supabase.rpc("sync_meta_assets", { p_account_id: accountId, p_assets: assets })
    if (syncError) throw syncError
    return settingsRedirect(appOrigin, "connected")
  } catch (error) {
    console.error("Meta OAuth callback failed", { message: error instanceof Error ? error.message : "Unknown error" })
    return settingsRedirect(appOrigin, "failed")
  }
}
