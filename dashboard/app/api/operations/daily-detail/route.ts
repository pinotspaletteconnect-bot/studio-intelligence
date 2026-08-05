import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getDailyOperatingDetail } from "@/lib/services/operations"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"

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
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(
      await getDailyOperatingDetail(
        parsed.data.studioId === "all" ? undefined : parsed.data.studioId,
        parsed.data.date,
        access.allowedStudioIds
      )
    )
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Daily operating detail failed", error)
    return NextResponse.json(
      { error: "Daily operating detail is temporarily unavailable." },
      { status: 500 }
    )
  }
}
