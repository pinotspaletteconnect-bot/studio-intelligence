import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getArtSuppliesSalesDetail } from "@/lib/services/operations"

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
    return NextResponse.json(
      await getArtSuppliesSalesDetail(
        parsed.data.studioId === "all" ? undefined : parsed.data.studioId,
        parsed.data.startDate,
        parsed.data.endDate
      )
    )
  } catch (error) {
    console.error("Art Supplies detail failed", error)
    return NextResponse.json({ error: "Art Supplies detail is temporarily unavailable." }, { status: 500 })
  }
}
