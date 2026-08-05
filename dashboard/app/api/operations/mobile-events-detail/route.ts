import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getClassEventSalesDetail } from "@/lib/services/operations"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"

const querySchema = z.object({
  studioId: z.union([z.literal("all"), z.coerce.number().int().positive()]),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success || parsed.data.startDate > parsed.data.endDate) {
    return NextResponse.json({ error: "Choose a valid studio and date range." }, { status: 400 })
  }

  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(
      await getClassEventSalesDetail(
        "Mobile Events",
        parsed.data.studioId === "all" ? undefined : parsed.data.studioId,
        parsed.data.startDate,
        parsed.data.endDate,
        access.allowedStudioIds
      )
    )
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Mobile events detail failed", error)
    return NextResponse.json({ error: "Mobile events detail is temporarily unavailable." }, { status: 500 })
  }
}
