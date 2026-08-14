import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

const laborRow = z.object({
  labor_date: z.string().date(),
  scheduled_hours: z.number().finite().nonnegative(),
  actual_hours: z.number().finite().nonnegative(),
  scheduled_cost: z.number().finite().nonnegative(),
  actual_cost: z.number().finite().nonnegative(),
  regular_hours: z.number().finite().nonnegative(),
  overtime_hours: z.number().finite().nonnegative(),
  double_overtime_hours: z.number().finite().nonnegative(),
  retrieved_at: z.string().datetime(),
})

const shiftRow = z.object({
  source_shift_id: z.number().int(),
  source_timecard_id: z.number().int().nullable(),
  role: z.string().max(300).nullable(),
  department: z.string().max(300).nullable(),
  labor_date: z.string().date(),
  scheduled_start: z.string().datetime().nullable(),
  scheduled_end: z.string().datetime().nullable(),
  clock_in: z.string().datetime().nullable(),
  clock_out: z.string().datetime().nullable(),
  scheduled_hours: z.number().finite().nonnegative(),
  actual_hours: z.number().finite().nonnegative(),
  scheduled_cost: z.number().finite().nonnegative(),
  actual_cost: z.number().finite().nonnegative(),
  retrieved_at: z.string().datetime(),
})

const schema = z.object({
  accountId: z.number().int().positive(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  daily: z.array(laborRow).max(63),
  shifts: z.array(shiftRow).max(10000),
  roles: z.array(z.object({
    labor_date: z.string().date(), role: z.string().max(300).nullable(),
    scheduled_hours: z.number().finite().nonnegative(), actual_hours: z.number().finite().nonnegative(),
    scheduled_cost: z.number().finite().nonnegative(), actual_cost: z.number().finite().nonnegative(),
    retrieved_at: z.string().datetime(),
  })).max(10000).default([]),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid labor payload" }, { status: 400 })

  const { data, error } = await supabase.rpc("replace_homebase_labor_range", {
    p_account_id: parsed.data.accountId,
    p_start_date: parsed.data.startDate,
    p_end_date: parsed.data.endDate,
    p_daily: parsed.data.daily,
    p_shifts: parsed.data.shifts,
    p_roles: parsed.data.roles,
  })
  if (error) return NextResponse.json({ error: "Labor load failed" }, { status: 422 })
  return NextResponse.json({ ok: true, accountId: parsed.data.accountId, result: data })
}
