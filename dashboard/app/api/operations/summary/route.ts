import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getOperationsDashboard } from "@/lib/services/operations"

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
    return NextResponse.json(
      await getOperationsDashboard(
        parsed.data.studioId,
        parsed.data.startDate,
        parsed.data.endDate
      )
    )
  } catch (error) {
    console.error("Operations summary failed", error)
    return NextResponse.json(
      { error: "Operations data is temporarily unavailable." },
      { status: 500 }
    )
  }
}
