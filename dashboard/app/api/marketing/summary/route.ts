import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getMarketingDashboard } from "@/lib/services/marketing"
import { getMarketingStrategyChanges } from "@/lib/services/marketing-strategy-changes"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"

const querySchema = z.object({
  studioId: z.string().max(100).optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
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
    const dashboard = await getMarketingDashboard(
      parsed.data.studioId,
      parsed.data.startDate,
      parsed.data.endDate,
      access.allowedStudioIds
    )
    const strategyChanges = await getMarketingStrategyChanges(
      access.organizationId,
      access.allowedStudioIds,
      dashboard.period.startDate,
      dashboard.period.endDate,
      parsed.data.studioId
    )
    return NextResponse.json({
      ...dashboard,
      strategyChanges,
      canManageStrategyChanges: ["owner", "administrator"].includes(access.role),
    })
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Marketing summary failed", error)
    return NextResponse.json(
      { error: "Marketing data is temporarily unavailable." },
      { status: 500 }
    )
  }
}
