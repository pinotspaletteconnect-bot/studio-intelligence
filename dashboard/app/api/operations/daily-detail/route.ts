import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getDailyOperatingDetail } from "@/lib/services/operations"

const querySchema = z.object({
  studioId: z.union([z.literal("all"), z.coerce.number().int().positive()]),
  date: z.iso.date(),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid studio and operating date." },
      { status: 400 }
    )
  }

  try {
    return NextResponse.json(
      await getDailyOperatingDetail(
        parsed.data.studioId === "all" ? undefined : parsed.data.studioId,
        parsed.data.date
      )
    )
  } catch (error) {
    console.error("Daily operating detail failed", error)
    return NextResponse.json(
      { error: "Daily operating detail is temporarily unavailable." },
      { status: 500 }
    )
  }
}
