import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const schema = z.object({
  accountId: z.number().int().positive(),
  locationUuid: z.string().trim().min(1).max(200),
  locationName: z.string().trim().max(300).default(""),
})

function authorized(request: Request) {
  const expected = process.env.HOMEBASE_SECRET_BROKER_TOKEN ?? process.env.PTS_SECRET_BROKER_TOKEN
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(actual)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid validation request" }, { status: 400 })

  const { error } = await supabase.rpc("validate_homebase_connection", {
    p_account_id: parsed.data.accountId,
    p_location_uuid: parsed.data.locationUuid,
    p_location_name: parsed.data.locationName,
  })
  if (error) return NextResponse.json({ error: "Connection validation failed" }, { status: 422 })
  return NextResponse.json({ ok: true, accountId: parsed.data.accountId })
}
