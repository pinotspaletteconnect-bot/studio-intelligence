import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  createMarketingStrategyChange,
  deleteMarketingStrategyChange,
  strategyChangeTypes,
} from "@/lib/services/marketing-strategy-changes"
import {
  apiAccessResponse,
  assertStudioAccess,
  requireApiAccess,
} from "@/lib/auth/api"

const createSchema = z.object({
  studioId: z.number().int().positive().nullable(),
  effectiveDate: z.iso.date(),
  changeType: z.enum(strategyChangeTypes),
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(1000).optional(),
})

const deleteSchema = z.object({ id: z.number().int().positive() })

function canManage(role: string) {
  return role === "owner" || role === "administrator"
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiAccess()
    if (!canManage(access.role)) {
      return NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403 }
      )
    }

    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a valid strategy change." },
        { status: 400 }
      )
    }
    if (parsed.data.studioId != null) {
      assertStudioAccess(access, parsed.data.studioId)
    }

    const change = await createMarketingStrategyChange({
      organizationId: access.organizationId,
      studioId: parsed.data.studioId,
      effectiveDate: parsed.data.effectiveDate,
      changeType: parsed.data.changeType,
      title: parsed.data.title,
      notes: parsed.data.notes,
      createdBy: access.userId,
    })
    return NextResponse.json(change, { status: 201 })
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Unable to create marketing strategy change", error)
    return NextResponse.json(
      { error: "The strategy change could not be saved." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireApiAccess()
    if (!canManage(access.role)) {
      return NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403 }
      )
    }

    const parsed = deleteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Choose a valid strategy change." },
        { status: 400 }
      )
    }
    await deleteMarketingStrategyChange(access.organizationId, parsed.data.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Unable to delete marketing strategy change", error)
    return NextResponse.json(
      { error: "The strategy change could not be removed." },
      { status: 500 }
    )
  }
}
