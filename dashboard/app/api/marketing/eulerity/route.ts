import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiAccessResponse, requireApiAccess } from "@/lib/auth/api"
import { getEulerityComparison } from "@/lib/services/eulerity"

export async function GET(request: NextRequest) {
  const parsed = z.object({ startDate: z.iso.date().optional(), endDate: z.iso.date().optional() })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid date range." }, { status: 400 })
  try {
    const access = await requireApiAccess()
    return NextResponse.json(await getEulerityComparison(parsed.data.startDate, parsed.data.endDate, access.allowedStudioIds), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const response = apiAccessResponse(error)
    if (response) return response
    console.error("Eulerity comparison failed", error)
    return NextResponse.json({ error: "Eulerity data is temporarily unavailable." }, { status: 500 })
  }
}
