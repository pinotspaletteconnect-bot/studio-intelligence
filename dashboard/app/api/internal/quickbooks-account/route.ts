import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"
const schema = z.object({ accountId: z.number().int().positive() })

function authorized(request: Request) {
  const expected = process.env.QUICKBOOKS_SECRET_BROKER_TOKEN
    ?? process.env.GA4_SECRET_BROKER_TOKEN
    ?? process.env.MNTN_SECRET_BROKER_TOKEN
    ?? process.env.PTS_SECRET_BROKER_TOKEN
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(actual)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid account request" }, { status: 400 })
  }

  const [{ data: credentials, error: credentialError }, { data: targets, error: targetError }] = await Promise.all([
    supabase.rpc("get_quickbooks_connection_secret", { p_connection_id: parsed.data.accountId }),
    supabase.from("quickbooks_collection_targets").select("*").eq("connection_id", parsed.data.accountId),
  ])
  const account = targets?.[0]
  if (credentialError || targetError || !credentials || !account) {
    console.error("QuickBooks broker resolution failed", {
      accountId: parsed.data.accountId,
      credentialCode: credentialError?.code,
      targetCode: targetError?.code,
    })
    return NextResponse.json({ error: "Account resolution failed" }, { status: 404 })
  }

  return NextResponse.json(
    { credentials, account, targets: targets ?? [] },
    { headers: { "Cache-Control": "no-store, private" } },
  )
}

