import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const requestSchema = z.object({ accountId: z.number().int().positive() })

function authorized(request: Request) {
  const configuredToken = process.env.PTS_SECRET_BROKER_TOKEN
  const suppliedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!configuredToken) return false
  const configured = Buffer.from(configuredToken)
  const supplied = Buffer.from(suppliedToken)
  return configured.length === supplied.length && timingSafeEqual(configured, supplied)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid account request" }, { status: 400 })

  const [{ data: credentials, error: credentialError }, { data: targets, error: targetError }] = await Promise.all([
    supabase.rpc("get_pts_account_secret", { p_account_id: parsed.data.accountId }),
    supabase
      .from("pts_collection_targets")
      .select("brand_id,studio_id,studio_code,studio_name,timezone,pts_location_id,reports")
      .eq("account_id", parsed.data.accountId),
  ])
  if (credentialError || targetError || !credentials) {
    console.error("PTS broker resolution failed", {
      accountId: parsed.data.accountId,
      credentialCode: credentialError?.code,
      targetCode: targetError?.code,
    })
    return NextResponse.json({ error: "Account resolution failed" }, { status: 404 })
  }
  if (!targets?.length) return NextResponse.json({ error: "Account has no studio mappings" }, { status: 409 })

  return NextResponse.json(
    {
      credentials,
      studios: targets.map((target) => ({
        studioId: target.studio_id,
        brandId: target.brand_id,
        code: target.studio_code,
        locationId: target.pts_location_id,
        locationName: target.studio_name,
        timeZone: target.timezone,
        reports: Array.isArray(target.reports) ? target.reports : [],
      })),
    },
    { headers: { "Cache-Control": "no-store, private" } }
  )
}
