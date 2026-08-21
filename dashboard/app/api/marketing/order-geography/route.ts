import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"
import { getOrderGeography } from "@/lib/services/order-geography"

const schema = z.object({ studioId: z.string().max(100).optional(), startDate: z.iso.date(), endDate: z.iso.date() }).refine(value => value.startDate <= value.endDate)

export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: "The report filters are invalid." }, { status: 400 })
  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    return NextResponse.json(await getOrderGeography(parsed.data.studioId, parsed.data.startDate, parsed.data.endDate, access.allowedStudioIds))
  } catch (error) {
    const response = apiAccessResponse(error)
    if (response) return response
    console.error("Order geography failed", error)
    return NextResponse.json({ error: "Order geography is temporarily unavailable." }, { status: 500 })
  }
}
