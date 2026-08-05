import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getOperationsDashboardWithComparison } from "@/lib/services/operations"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"

const querySchema = z.object({
  studioId: z.string().max(100).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  comparison: z.enum(["previous", "priorYearWeek", "custom"]).default("previous"),
  comparisonStartDate: z.iso.date().optional(),
  comparisonEndDate: z.iso.date().optional(),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )

  if (!parsed.success) {
    return NextResponse.json(
      { error: "The studio or date range is invalid." },
      { status: 400 }
    )
  }

  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(
      await getOperationsDashboardWithComparison(
        parsed.data.studioId,
        parsed.data.startDate,
        parsed.data.endDate,
        parsed.data.comparison,
        parsed.data.comparisonStartDate,
        parsed.data.comparisonEndDate,
        access.allowedStudioIds
      )
    )
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Operations summary failed", error)
    return NextResponse.json(
      { error: "Operations data is temporarily unavailable." },
      { status: 500 }
    )
  }
}
