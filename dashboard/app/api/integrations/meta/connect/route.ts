import { NextResponse } from "next/server"
import { z } from "zod"

import { requireDashboardContext } from "@/lib/auth/session"
import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { createMetaOauthState, metaOauthClient } from "@/lib/integrations/meta-oauth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) return NextResponse.json({ error: "Only an owner or administrator can connect Meta." }, { status: 403 })
  const url = new URL(request.url)
  const appOrigin = getTrustedAppOrigin(url.origin)
  const parsed = z.string().trim().min(2).max(120).safeParse(url.searchParams.get("accountName"))
  if (!parsed.success) return NextResponse.redirect(new URL("/settings?meta=invalid-label#meta-connections", appOrigin))
  const { appId, graphVersion } = metaOauthClient()
  const authorize = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`)
  authorize.search = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${appOrigin}/api/integrations/meta/callback`,
    response_type: "code",
    scope: "ads_read,business_management,pages_show_list,pages_read_engagement,read_insights",
    state: createMetaOauthState({ organizationId: access.organizationId, userId: access.userId, accountName: parsed.data }),
  }).toString()
  return NextResponse.redirect(authorize)
}
