import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"
const schema = z.object({ accountId: z.number().int().positive() })

function authorized(request: Request) {
  const expected = process.env.HOMEBASE_SECRET_BROKER_TOKEN ?? process.env.PTS_SECRET_BROKER_TOKEN
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const a = Buffer.from(expected); const b = Buffer.from(actual)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid account request" }, { status: 400 })
  const [{ data: credentials, error: secretError }, { data: selected, error: selectedError }] = await Promise.all([
    supabase.rpc("get_homebase_account_secret", { p_account_id: parsed.data.accountId }),
    supabase.from("homebase_integration_accounts").select("organization_id,secret_reference").eq("id", parsed.data.accountId).eq("is_active", true).maybeSingle(),
  ])
  if (secretError || selectedError || !credentials || !selected) return NextResponse.json({ error: "Account resolution failed" }, { status: 404 })
  const { data: accountRows, error: accountError } = await supabase
    .from("homebase_integration_accounts")
    .select("id")
    .eq("organization_id", selected.organization_id)
    .eq("secret_reference", selected.secret_reference)
    .eq("is_active", true)
  if (accountError || !accountRows?.length) return NextResponse.json({ error: "Account targets unavailable" }, { status: 404 })
  const accountIds = accountRows.map(account => account.id)
  const { data: targets, error: targetError } = await supabase
    .from("homebase_collection_targets")
    .select("account_id,organization_id,brand_id,studio_id,studio_code,studio_name,timezone,location_uuid,location_name")
    .in("account_id", accountIds)
  if (targetError || !targets?.length) return NextResponse.json({ error: "Account targets unavailable" }, { status: 404 })
  return NextResponse.json(
    { credentials, target: targets.find(target => target.account_id === parsed.data.accountId) ?? targets[0], targets },
    { headers: { "Cache-Control": "no-store, private" } }
  )
}
