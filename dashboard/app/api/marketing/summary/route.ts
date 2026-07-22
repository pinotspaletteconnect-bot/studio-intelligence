import { NextRequest, NextResponse } from "next/server"
import { getMarketingDashboard } from "@/lib/services/marketing"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const dashboard = await getMarketingDashboard(
    params.get("studioId") ?? undefined,
    params.get("startDate") ?? undefined,
    params.get("endDate") ?? undefined
  )

  return NextResponse.json(dashboard)
}