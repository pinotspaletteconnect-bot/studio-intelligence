import { NextResponse } from "next/server"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { requireDashboardContext } from "@/lib/auth/session"
import {
  accountingGmailOauthClient,
  createAccountingGmailOauthState,
} from "@/lib/integrations/accounting-gmail-oauth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const access = await requireDashboardContext()
  if (!(["owner", "administrator"] as string[]).includes(access.role)) {
    return NextResponse.json(
      { error: "Only an owner or administrator can connect a receipt mailbox." },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const appOrigin = getTrustedAppOrigin(url.origin)
  const connectionName = z
    .string()
    .trim()
    .min(2)
    .max(120)
    .safeParse(url.searchParams.get("connectionName"))
  if (!connectionName.success) {
    return NextResponse.redirect(
      new URL(
        "/settings?accountingGmail=invalid-label#accounting-gmail-connections",
        appOrigin,
      ),
    )
  }

  const { clientId } = accountingGmailOauthClient()
  const redirectUri = `${appOrigin}/api/integrations/accounting-gmail/callback`
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    scope: "openid email https://www.googleapis.com/auth/gmail.readonly",
    state: createAccountingGmailOauthState({
      organizationId: access.organizationId,
      userId: access.userId,
      connectionName: connectionName.data,
    }),
  }).toString()

  return NextResponse.redirect(authorize)
}

