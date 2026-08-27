import { NextResponse } from "next/server"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { requireDashboardContext } from "@/lib/auth/session"
import {
  accountingGmailOauthClient,
  readAccountingGmailOauthState,
} from "@/lib/integrations/accounting-gmail-oauth"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive().optional(),
  token_type: z.string().optional(),
})

const gmailProfileSchema = z.object({
  emailAddress: z.email(),
  historyId: z.string().min(1).optional(),
})

function settingsRedirect(origin: string, result: string) {
  return NextResponse.redirect(
    new URL(
      `/settings?accountingGmail=${encodeURIComponent(result)}#accounting-gmail-connections`,
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
    const state = readAccountingGmailOauthState(
      url.searchParams.get("state") ?? "",
    )
    if (
      state.userId !== access.userId ||
      state.organizationId !== access.organizationId ||
      !(["owner", "administrator"] as string[]).includes(access.role)
    ) {
      return settingsRedirect(appOrigin, "unauthorized")
    }

    const code = url.searchParams.get("code")
    if (!code) return settingsRedirect(appOrigin, "missing-code")

    const { clientId, clientSecret } = accountingGmailOauthClient()
    const redirectUri = `${appOrigin}/api/integrations/accounting-gmail/callback`
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!tokenResponse.ok) {
      throw new Error(`Google token exchange failed (${tokenResponse.status})`)
    }
    const tokens = tokenSchema.parse(await tokenResponse.json())

    const profileResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        headers: { authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!profileResponse.ok) {
      throw new Error(`Gmail profile discovery failed (${profileResponse.status})`)
    }
    const profile = gmailProfileSchema.parse(await profileResponse.json())

    const { data: connectionId, error: connectionError } = await supabase.rpc(
      "create_accounting_gmail_connection_with_secret",
      {
        p_organization_id: access.organizationId,
        p_connection_name: state.connectionName,
        p_account_email: profile.emailAddress.toLowerCase(),
        p_oauth_credentials: {
          refresh_token: tokens.refresh_token,
          token_uri: "https://oauth2.googleapis.com/token",
        },
        p_granted_scopes: [
          "openid",
          "email",
          "https://www.googleapis.com/auth/gmail.readonly",
        ],
      },
    )
    if (connectionError || !connectionId) {
      throw connectionError ?? new Error("Gmail connection creation failed")
    }

    const { error: metadataError } = await supabase
      .from("accounting_email_connections")
      .update({
        source_history_id: profile.historyId ?? null,
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("organization_id", access.organizationId)
    if (metadataError) throw metadataError

    return settingsRedirect(appOrigin, "connected-read-only")
  } catch (error) {
    console.error("Accounting Gmail OAuth callback failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return settingsRedirect(appOrigin, "failed")
  }
}

