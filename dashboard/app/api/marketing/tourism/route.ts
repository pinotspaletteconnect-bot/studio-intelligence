import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"
import { getTourismReport } from "@/lib/services/tourism"

const schema = z.object({ studioId: z.string().max(100).optional(), startDate: z.iso.date(), endDate: z.iso.date() }).refine(value => value.startDate <= value.endDate)
export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: "The report filters are invalid." }, { status: 400 })
  try {
    const access = await requireApiAccess(); assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(await getTourismReport(parsed.data.studioId, parsed.data.startDate, parsed.data.endDate, access.allowedStudioIds))
  } catch (error) {
    const response = apiAccessResponse(error); if (response) return response
    console.error("Tourism report failed", error)
    return NextResponse.json({ error: "Tourism reporting is temporarily unavailable." }, { status: 500 })
  }
}
