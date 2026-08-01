import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getUpcomingClasses } from "@/lib/services/upcoming-classes"

const querySchema = z.object({
  studioId: z.string().max(100).optional(),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: "The studio selection is invalid." }, { status: 400 })
  }
  try {
    return NextResponse.json(await getUpcomingClasses(parsed.data.studioId))
  } catch (error) {
    console.error("Upcoming classes failed", error)
    return NextResponse.json({ error: "Upcoming class data is temporarily unavailable." }, { status: 500 })
  }
}
