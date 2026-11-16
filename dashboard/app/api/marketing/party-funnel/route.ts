import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from '@/lib/auth/api'
import { getPartyFunnel } from '@/lib/services/party-funnel'

const query = z.object({ studioId: z.string().regex(/^(all|[1-9]\d*)$/).default('all'), startDate: z.iso.date().optional(), endDate: z.iso.date().optional() })
  .refine(value => Boolean(value.startDate) === Boolean(value.endDate) && (!value.startDate || value.startDate <= value.endDate!))
export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid studio or period.' }, { status: 400 })
  try {
    const access = await requireApiAccess()
    assertStudioAccess(access, parsed.data.studioId)
    const { studioId, startDate, endDate } = parsed.data
    return NextResponse.json(await getPartyFunnel(studioId, startDate && endDate ? { startDate, endDate } : undefined, access.allowedStudioIds), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    return NextResponse.json({ error: 'Party reporting is temporarily unavailable.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
