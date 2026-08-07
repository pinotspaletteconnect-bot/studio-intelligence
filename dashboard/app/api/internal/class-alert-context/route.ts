import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const requestSchema = z.object({ ptsAccountId: z.number().int().positive() })

function authorized(request: Request) {
  const expected = process.env.PTS_SECRET_BROKER_TOKEN
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid account request" }, { status: 400 })

  const [{ data: ptsCredentials, error: ptsError }, { data: targets, error: targetError }] = await Promise.all([
    supabase.rpc("get_pts_account_secret", { p_account_id: parsed.data.ptsAccountId }),
    supabase.from("low_reservation_class_alert_targets").select("*").eq("pts_account_id", parsed.data.ptsAccountId).eq("enabled", true),
  ])
  if (ptsError || targetError || !ptsCredentials) {
    console.error("Class-alert context resolution failed", {
      ptsAccountId: parsed.data.ptsAccountId,
      ptsCode: ptsError?.code,
      targetCode: targetError?.code,
    })
    return NextResponse.json({ error: "Class-alert context unavailable" }, { status: 404 })
  }

  const accountIds = [...new Set((targets ?? []).map((target) => target.textellent_account_id))]
  const secretEntries = await Promise.all(accountIds.map(async (accountId) => {
    const { data, error } = await supabase.rpc("get_textellent_account_secret", { p_account_id: accountId })
    if (error || !data?.authCode) throw new Error(`Textellent account ${accountId} is unavailable`)
    return [accountId, data.authCode] as const
  })).catch(() => null)
  if (!secretEntries) return NextResponse.json({ error: "Textellent connection unavailable" }, { status: 409 })
  const authCodes = new Map(secretEntries)

  return NextResponse.json({
    credentials: ptsCredentials,
    studios: (targets ?? []).map((target) => ({
      studioId: target.studio_id,
      studioCode: target.studio_code,
      studioName: target.studio_name,
      timeZone: target.timezone,
      ptsLocationId: target.pts_location_id,
      senderNumber: target.sender_number,
      authCode: authCodes.get(target.textellent_account_id),
      maximumReservations: target.maximum_reservations,
      leadHours: target.lead_hours,
      earliestSendTime: String(target.earliest_send_time).slice(0, 5),
      messageTemplate: target.message_template,
      excludedClassTypes: target.excluded_class_types,
      excludedTitlePatterns: target.excluded_title_patterns,
    })),
  }, { headers: { "Cache-Control": "no-store, private" } })
}
