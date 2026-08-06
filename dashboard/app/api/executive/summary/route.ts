import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getExecutiveDashboard } from "@/lib/services/executive"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"

const querySchema = z.object({
  studioId: z.string().max(100).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  comparison: z.enum(["previous", "priorYearWeek", "custom"]).default("previous"),
  comparisonStartDate: z.iso.date().optional(),
  comparisonEndDate: z.iso.date().optional(),
  weekComparisonStartDate: z.iso.date().optional(),
  weekComparisonEndDate: z.iso.date().optional(),
}).superRefine((value, context) => {
  const hasStart = Boolean(value.weekComparisonStartDate)
  const hasEnd = Boolean(value.weekComparisonEndDate)
  if (hasStart !== hasEnd) {
    context.addIssue({ code: "custom", message: "Both week comparison dates are required." })
  }
  if (value.weekComparisonStartDate && value.weekComparisonEndDate && value.weekComparisonStartDate > value.weekComparisonEndDate) {
    context.addIssue({ code: "custom", message: "The week comparison start must be on or before its end." })
  }
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  if (!parsed.success) {
    return NextResponse.json({ error: "The studio or date range is invalid." }, { status: 400 })
  }

  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(
      await getExecutiveDashboard(
        parsed.data.studioId,
        parsed.data.startDate,
        parsed.data.endDate,
        parsed.data.comparison,
        parsed.data.comparisonStartDate,
        parsed.data.comparisonEndDate,
        access.allowedStudioIds,
        parsed.data.weekComparisonStartDate,
        parsed.data.weekComparisonEndDate
      )
    )
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Executive summary failed", error)
    return NextResponse.json(
      { error: "Executive performance is temporarily unavailable." },
      { status: 500 }
    )
  }
}
