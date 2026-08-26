import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  apiAccessResponse,
  assertStudioAccess,
  requireApiAccess,
} from "@/lib/auth/api"
import { supabase } from "@/lib/supabase/server"

const schema = z.object({
  studioId: z.number().int().positive(),
  laborDate: z.iso.date(),
  resolution: z.enum(["assign_role", "cogs", "overhead", "exclude"]),
  roleName: z.string().trim().max(300).nullable(),
  actualHours: z.number().finite().nonnegative(),
  actualCost: z.number().finite().nonnegative(),
  note: z.string().trim().min(1).max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiAccess()
    if (!['owner', 'administrator'].includes(access.role)) {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 })
    }
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid labor correction and note." }, { status: 400 })
    }
    if (parsed.data.resolution === "assign_role" && !parsed.data.roleName) {
      return NextResponse.json({ error: "Choose the Homebase role for this labor." }, { status: 400 })
    }
    assertStudioAccess(access, parsed.data.studioId)
    const { error } = await supabase.from("homebase_labor_reconciliations").upsert({
      organization_id: access.organizationId,
      studio_id: parsed.data.studioId,
      labor_date: parsed.data.laborDate,
      resolution: parsed.data.resolution,
      corrected_role_name: parsed.data.resolution === "assign_role" ? parsed.data.roleName : null,
      corrected_actual_hours: parsed.data.resolution === "exclude" ? 0 : parsed.data.actualHours,
      corrected_actual_cost: parsed.data.resolution === "exclude" ? 0 : parsed.data.actualCost,
      note: parsed.data.note ?? `Assigned unnamed Homebase labor to ${parsed.data.roleName}.`,
      created_by: access.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,studio_id,labor_date" })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const response = apiAccessResponse(error)
    if (response) return response
    console.error("Unable to reconcile Homebase labor", error)
    return NextResponse.json({ error: "The labor correction could not be saved." }, { status: 500 })
  }
}
