import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"
import { getPrivateParties } from "@/lib/services/private-parties"

const querySchema = z.object({
  studioId: z.union([z.literal("all"), z.coerce.number().int().positive()]),
  startDate: z.iso.date(), endDate: z.iso.date(),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success || parsed.data.startDate > parsed.data.endDate) {
    return NextResponse.json({ error: "Choose a valid studio and date range." }, { status: 400 })
  }
  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(await getPrivateParties(String(parsed.data.studioId), parsed.data.startDate, parsed.data.endDate, access.allowedStudioIds))
  } catch (error) {
    const known = apiAccessResponse(error)
    if (known) return known
    console.error("Private parties report failed", error)
    return NextResponse.json({ error: "Private-party reporting is temporarily unavailable." }, { status: 500 })
  }
}
