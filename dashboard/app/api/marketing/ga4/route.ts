import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"
import { getGa4NorthAmericaDashboard } from "@/lib/services/ga4-reporting"

const querySchema = z.object({
  studioId: z.string().max(100).optional(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  comparison: z.enum(["previous", "priorYearWeek", "custom"]).default("previous"),
  comparisonStartDate: z.iso.date().optional(),
  comparisonEndDate: z.iso.date().optional(),
}).refine(value => value.startDate <= value.endDate, "Invalid date range")
  .refine(value => value.comparison !== "custom" || Boolean(value.comparisonStartDate && value.comparisonEndDate), "Custom comparison dates are required")
  .refine(value => !value.comparisonStartDate || !value.comparisonEndDate || value.comparisonStartDate <= value.comparisonEndDate, "Invalid comparison range")

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: "The studio or date range is invalid." }, { status: 400 })
  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(await getGa4NorthAmericaDashboard(
      parsed.data.studioId,
      parsed.data.startDate,
      parsed.data.endDate,
      access.allowedStudioIds,
      parsed.data.comparison,
      parsed.data.comparisonStartDate,
      parsed.data.comparisonEndDate
    ))
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("GA4 North America report failed", error)
    return NextResponse.json({ error: "GA4 reporting is temporarily unavailable." }, { status: 500 })
  }
}
