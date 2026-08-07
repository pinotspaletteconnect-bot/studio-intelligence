import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const claimSchema = z.object({
  action: z.literal("claim"), organizationId: z.number().int().positive(), studioId: z.number().int().positive(),
  classId: z.string().regex(/^\d+$/), classStartsAt: z.iso.datetime(), scheduledFor: z.iso.datetime(),
  reservationCount: z.number().int().min(1).max(20),
})
const completeSchema = z.object({
  action: z.literal("complete"), organizationId: z.number().int().positive(), studioId: z.number().int().positive(),
  classId: z.string().regex(/^\d+$/), status: z.enum(["sent", "skipped", "failed"]),
  reservationCount: z.number().int().min(0).max(20), recipientCount: z.number().int().min(0).max(500),
  messageIds: z.array(z.string().max(200)).max(500), errorCode: z.string().max(100).optional(),
})

function authorized(request: Request) {
  const expected = process.env.PTS_SECRET_BROKER_TOKEN
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!expected) return false
  const left = Buffer.from(expected); const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (body?.action === "claim") {
    const parsed = claimSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid claim" }, { status: 400 })
    const { data, error } = await supabase.rpc("claim_low_reservation_class_alert", {
      p_organization_id: parsed.data.organizationId, p_studio_id: parsed.data.studioId,
      p_source_class_id: parsed.data.classId, p_class_starts_at: parsed.data.classStartsAt,
      p_scheduled_for: parsed.data.scheduledFor, p_reservation_count: parsed.data.reservationCount,
    })
    if (error) return NextResponse.json({ error: "Claim failed" }, { status: 500 })
    return NextResponse.json({ claimed: data === true })
  }
  const parsed = completeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid completion" }, { status: 400 })
  const { error } = await supabase.from("low_reservation_class_alert_deliveries").update({
    status: parsed.data.status, reservation_count: parsed.data.reservationCount,
    recipient_count: parsed.data.recipientCount, textellent_message_ids: parsed.data.messageIds,
    error_code: parsed.data.errorCode ?? null, completed_at: new Date().toISOString(),
  }).eq("organization_id", parsed.data.organizationId).eq("studio_id", parsed.data.studioId).eq("source_class_id", parsed.data.classId).eq("status", "claimed")
  if (error) return NextResponse.json({ error: "Completion failed" }, { status: 500 })
  return NextResponse.json({ complete: true })
}
