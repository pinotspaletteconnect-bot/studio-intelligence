import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

function authorized(request: Request) {
  const expected = process.env.PTS_SECRET_BROKER_TOKEN
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data, error } = await supabase
    .from("low_reservation_class_alert_targets")
    .select("pts_account_id,timezone")
    .eq("enabled", true)
  if (error) return NextResponse.json({ error: "Class-alert accounts unavailable" }, { status: 500 })

  const timeZonesByAccount = new Map<number, Set<string>>()
  for (const row of data ?? []) {
    const timeZones = timeZonesByAccount.get(row.pts_account_id) ?? new Set<string>()
    timeZones.add(row.timezone)
    timeZonesByAccount.set(row.pts_account_id, timeZones)
  }
  return NextResponse.json({
    accounts: [...timeZonesByAccount].map(([ptsAccountId, timeZones]) => ({
      ptsAccountId,
      timeZones: [...timeZones].sort(),
    })),
  }, { headers: { "Cache-Control": "no-store, private" } })
}
