import { NextResponse } from "next/server"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { requireDashboardContext } from "@/lib/auth/session"
import {
  quickBooksOauthClient,
  readQuickBooksOauthState,
} from "@/lib/integrations/quickbooks-oauth"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  x_refresh_token_expires_in: z.number().int().positive().optional(),
  token_type: z.string().optional(),
})

const companyInfoSchema = z.object({
  CompanyInfo: z.object({
    CompanyName: z.string().min(1),
  }),
})

function settingsRedirect(origin: string, result: string) {
  return NextResponse.redirect(
    new URL(
      `/settings?quickbooks=${encodeURIComponent(result)}#quickbooks-connections`,
      origin,
    ),
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const appOrigin = getTrustedAppOrigin(url.origin)
  if (url.searchParams.get("error")) {
    return settingsRedirect(appOrigin, "cancelled")
  }

  try {
    const access = await requireDashboardContext()
    const state = readQuickBooksOauthState(url.searchParams.get("state") ?? "")
    if (
      state.userId !== access.userId ||
      state.organizationId !== access.organizationId ||
      !(["owner", "administrator"] as string[]).includes(access.role)
    ) {
      return settingsRedirect(appOrigin, "unauthorized")
    }

    const code = url.searchParams.get("code")
    const realmId = z
      .string()
      .regex(/^\d{1,40}$/)
      .safeParse(url.searchParams.get("realmId"))
    if (!code) return settingsRedirect(appOrigin, "missing-code")
    if (!realmId.success) return settingsRedirect(appOrigin, "missing-realm")

    const { clientId, clientSecret, apiBaseUrl } = quickBooksOauthClient()
    const redirectUri = `${appOrigin}/api/integrations/quickbooks/callback`
    const basicAuthorization = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    )
    const tokenResponse = await fetch(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Basic ${basicAuthorization}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!tokenResponse.ok) {
      throw new Error(`QuickBooks token exchange failed (${tokenResponse.status})`)
    }
    const tokens = tokenSchema.parse(await tokenResponse.json())

    const companyResponse = await fetch(
      `${apiBaseUrl}/v3/company/${realmId.data}/companyinfo/${realmId.data}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${tokens.access_token}`,
        },
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!companyResponse.ok) {
      throw new Error(
        `QuickBooks company discovery failed (${companyResponse.status})`,
      )
    }
    const company = companyInfoSchema.parse(await companyResponse.json())

    const { data: connectionId, error: connectionError } = await supabase.rpc(
      "create_quickbooks_oauth_connection_with_secret",
      {
        p_organization_id: access.organizationId,
        p_connection_name: state.connectionName,
        p_realm_id: realmId.data,
        p_oauth_credentials: {
          refresh_token: tokens.refresh_token,
          token_uri: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
          refresh_token_expires_in: tokens.x_refresh_token_expires_in,
        },
        p_granted_scopes: ["com.intuit.quickbooks.accounting"],
      },
    )
    if (connectionError || !connectionId) {
      throw connectionError ?? new Error("QuickBooks connection creation failed")
    }

    const { error: metadataError } = await supabase
      .from("quickbooks_connections")
      .update({
        company_name: company.CompanyInfo.CompanyName,
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
        last_discovered_at: new Date().toISOString(),
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("organization_id", access.organizationId)
    if (metadataError) throw metadataError

    return settingsRedirect(appOrigin, "connected-read-only")
  } catch (error) {
    console.error("QuickBooks OAuth callback failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return settingsRedirect(appOrigin, "failed")
  }
}

