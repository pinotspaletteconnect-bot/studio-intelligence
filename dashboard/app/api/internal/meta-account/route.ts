import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { createBrokerClient } from "@/lib/supabase/broker"
import { readBrokerData } from "@/lib/supabase/broker-requests"

export const runtime = "nodejs"
const schema = z.object({ accountId: z.number().int().positive() })

function authorized(request: Request) {
  const expected = process.env.META_SECRET_BROKER_TOKEN ?? process.env.GA4_SECRET_BROKER_TOKEN ?? process.env.MNTN_SECRET_BROKER_TOKEN ?? process.env.PTS_SECRET_BROKER_TOKEN
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const left = Buffer.from(expected); const right = Buffer.from(actual)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid account request" }, { status: 400 })
  const supabase = createBrokerClient()
  const [{ data: credentials, error: credentialError }, { data: account, error: accountError }, { data: targets, error: targetError }] = await Promise.all([
    readBrokerData(() => supabase.rpc("get_meta_account_secret", { p_account_id: parsed.data.accountId })),
    readBrokerData(() => supabase.from("meta_collection_accounts").select("*").eq("account_id", parsed.data.accountId).maybeSingle()),
    readBrokerData(() => supabase.from("meta_collection_targets").select("*").eq("account_id", parsed.data.accountId)),
  ])
  if (credentialError || accountError || targetError || !credentials || !account) {
    console.error("Meta broker resolution failed", { accountId: parsed.data.accountId, credentialCode: credentialError?.code, accountCode: accountError?.code, targetCode: targetError?.code })
    const unavailable = !!(credentialError || accountError || targetError)
    return NextResponse.json(
      { error: unavailable ? "Account service temporarily unavailable" : "Account not found" },
      { status: unavailable ? 503 : 404, headers: { "Cache-Control": "no-store, private" } },
    )
  }
  return NextResponse.json({ credentials, account, targets: targets ?? [] }, { headers: { "Cache-Control": "no-store, private" } })
}
