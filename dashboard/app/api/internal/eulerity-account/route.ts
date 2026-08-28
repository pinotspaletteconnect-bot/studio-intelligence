import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { createBrokerClient } from "@/lib/supabase/broker"
import { readBrokerData } from "@/lib/supabase/broker-requests"

export const runtime = "nodejs"

const requestSchema = z.object({ accountId: z.number().int().positive() })

function authorized(request: Request) {
  const configuredToken = process.env.EULERITY_SECRET_BROKER_TOKEN ?? process.env.MNTN_SECRET_BROKER_TOKEN ?? process.env.PTS_SECRET_BROKER_TOKEN
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

  const supabase = createBrokerClient()
  const [{ data: credentials, error: credentialError }, { data: account, error: accountError }, { data: targets, error: targetError }] = await Promise.all([
    readBrokerData(() => supabase.rpc("get_eulerity_account_secret", { p_account_id: parsed.data.accountId })),
    readBrokerData(() => supabase.from("eulerity_collection_accounts").select("*").eq("account_id", parsed.data.accountId).maybeSingle()),
    readBrokerData(() => supabase.from("eulerity_collection_targets").select("*").eq("account_id", parsed.data.accountId)),
  ])
  if (credentialError || accountError || targetError || !credentials || !account) {
    console.error("Eulerity broker resolution failed", { accountId: parsed.data.accountId, credentialCode: credentialError?.code, accountCode: accountError?.code, targetCode: targetError?.code })
    const unavailable = !!(credentialError || accountError || targetError)
    return NextResponse.json(
      { error: unavailable ? "Account service temporarily unavailable" : "Account not found" },
      { status: unavailable ? 503 : 404, headers: { "Cache-Control": "no-store, private" } },
    )
  }
  return NextResponse.json({ credentials, account, targets: targets ?? [] }, { headers: { "Cache-Control": "no-store, private" } })
}
