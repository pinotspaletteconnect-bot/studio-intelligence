import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getUpcomingClasses } from "@/lib/services/upcoming-classes"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"

const querySchema = z.object({
  studioId: z.string().max(100).optional(),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: "The studio selection is invalid." }, { status: 400 })
  }
  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(
      await getUpcomingClasses(parsed.data.studioId, access.allowedStudioIds)
    )
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("Upcoming classes failed", error)
    return NextResponse.json({ error: "Upcoming class data is temporarily unavailable." }, { status: 500 })
  }
}
