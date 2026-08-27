import { NextResponse } from "next/server"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { requireDashboardContext } from "@/lib/auth/session"
import {
  createQuickBooksOauthState,
  quickBooksOauthClient,
} from "@/lib/integrations/quickbooks-oauth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const access = await requireDashboardContext()
  if (!(["owner", "administrator"] as string[]).includes(access.role)) {
    return NextResponse.json(
      { error: "Only an owner or administrator can connect QuickBooks." },
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
      new URL("/settings?quickbooks=invalid-label#quickbooks-connections", appOrigin),
    )
  }

  const { clientId } = quickBooksOauthClient()
  const redirectUri = `${appOrigin}/api/integrations/quickbooks/callback`
  const authorize = new URL("https://appcenter.intuit.com/connect/oauth2")
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state: createQuickBooksOauthState({
      organizationId: access.organizationId,
      userId: access.userId,
      connectionName: connectionName.data,
    }),
  }).toString()

  return NextResponse.redirect(authorize)
}

