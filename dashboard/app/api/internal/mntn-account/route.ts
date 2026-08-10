import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const requestSchema = z.object({ accountId: z.number().int().positive() })

function authorized(request: Request) {
  const configuredToken = process.env.MNTN_SECRET_BROKER_TOKEN ?? process.env.PTS_SECRET_BROKER_TOKEN
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
    supabase.rpc("get_mntn_account_secret", { p_account_id: parsed.data.accountId }),
    supabase
      .from("mntn_collection_targets")
      .select("organization_id,brand_id,studio_id,studio_code,studio_name,timezone,integration_id,advertiser_id,refresh_window_days")
      .eq("account_id", parsed.data.accountId),
  ])
  if (credentialError || targetError || !credentials) {
    console.error("MNTN broker resolution failed", {
      accountId: parsed.data.accountId,
      credentialCode: credentialError?.code,
      targetCode: targetError?.code,
    })
    return NextResponse.json({ error: "Account resolution failed" }, { status: 404 })
  }
  if (!targets?.length) return NextResponse.json({ error: "Account has no advertiser mapping" }, { status: 409 })

  return NextResponse.json({ credentials, targets }, {
    headers: { "Cache-Control": "no-store, private" },
  })
}
