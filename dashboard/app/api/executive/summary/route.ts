import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getExecutiveDashboard } from "@/lib/services/executive"

const querySchema = z.object({
  studioId: z.string().max(100).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  comparison: z.enum(["previous", "priorYearWeek", "custom"]).default("previous"),
  comparisonStartDate: z.iso.date().optional(),
  comparisonEndDate: z.iso.date().optional(),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  if (!parsed.success) {
    return NextResponse.json({ error: "The studio or date range is invalid." }, { status: 400 })
  }

  try {
    return NextResponse.json(
      await getExecutiveDashboard(
        parsed.data.studioId,
        parsed.data.startDate,
        parsed.data.endDate,
        parsed.data.comparison,
        parsed.data.comparisonStartDate,
        parsed.data.comparisonEndDate
      )
    )
  } catch (error) {
    console.error("Executive summary failed", error)
    return NextResponse.json(
      { error: "Executive performance is temporarily unavailable." },
      { status: 500 }
    )
  }
}
