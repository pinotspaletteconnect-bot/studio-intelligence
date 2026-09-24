import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { supabase } from "@/lib/supabase/server"
import { resolvePtsUploadTarget } from "@/lib/services/pts-upload-targets"

export const runtime = "nodejs"

const requestSchema = z.union([
  z.object({ purpose: z.literal("backfill"), studioCode: z.string().trim().min(1).max(100), organizationId: z.number().int().positive().optional(), studioId: z.number().int().positive().optional() }).strict()
    .refine(value => (value.organizationId === undefined) === (value.studioId === undefined)),
  z.object({ accountId: z.number().int().positive() }).strict(),
])

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

  if ("purpose" in parsed.data) {
    try {
      const studio = await resolvePtsUploadTarget(parsed.data.studioCode, parsed.data.organizationId, parsed.data.studioId)
      if (!studio) return NextResponse.json({ error: "Studio mapping unavailable or ambiguous" }, { status: 409 })
      return NextResponse.json({ studio }, { headers: { "Cache-Control": "no-store, private" } })
    } catch {
      console.error("PTS upload studio resolution failed")
      return NextResponse.json({ error: "Studio resolution unavailable" }, { status: 503 })
    }
  }

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
