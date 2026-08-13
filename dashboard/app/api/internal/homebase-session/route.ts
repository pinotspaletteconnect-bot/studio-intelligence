import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const cookieSchema = z.object({ domain: z.string().regex(/(^|\.)joinhomebase\.com$/i) }).passthrough()
const originSchema = z.object({ origin: z.string().url().refine(value => new URL(value).hostname.endsWith("joinhomebase.com")) }).passthrough()
const schema = z.object({
  accountId: z.number().int().positive(),
  storageState: z.object({ cookies: z.array(cookieSchema).max(100), origins: z.array(originSchema).max(20) }),
})

function authorized(request: Request) {
  const expected = process.env.HOMEBASE_SECRET_BROKER_TOKEN ?? process.env.PTS_SECRET_BROKER_TOKEN
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const a = Buffer.from(expected); const b = Buffer.from(actual)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid Homebase browser session" }, { status: 400 })
  const { error } = await supabase.rpc("store_homebase_browser_session", {
    p_account_id: parsed.data.accountId,
    p_storage_state: parsed.data.storageState,
  })
  if (error) return NextResponse.json({ error: "Homebase browser session could not be stored" }, { status: 500 })
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, private" } })
}
