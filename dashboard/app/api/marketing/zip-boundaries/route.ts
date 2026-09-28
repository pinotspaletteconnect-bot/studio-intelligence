import { NextRequest, NextResponse } from "next/server"
import { apiAccessResponse, requireApiAccess } from "@/lib/auth/api"
import { getCensusZipBoundaries, parseZipCodes } from "@/lib/maps/census-zip-boundaries"

export async function GET(request: NextRequest) {
  try {
    await requireApiAccess()
    const codes = parseZipCodes(request.nextUrl.searchParams.get("codes"))
    if (!codes) return NextResponse.json({ error: "Provide up to 220 five-digit ZIP codes." }, { status: 400 })
    return NextResponse.json(await getCensusZipBoundaries(codes), { headers: { "Cache-Control": "private, max-age=86400" } })
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("ZIP boundary lookup failed", error)
    return NextResponse.json({ error: "ZIP boundaries are temporarily unavailable." }, { status: 502 })
  }
}
