import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const state = vi.hoisted(() => ({ allowed: [1], signedIn: true }))
vi.mock('@/lib/auth/api', () => ({
  requireApiAccess: async () => { if (!state.signedIn) throw new Error('unauthenticated'); return { allowedStudioIds: state.allowed } },
  assertStudioAccess: (access: { allowedStudioIds: number[] }, id: string) => { if (id !== 'all' && !access.allowedStudioIds.includes(Number(id))) throw new Error('forbidden') },
  apiAccessResponse: (error: Error) => ['unauthenticated', 'forbidden'].includes(error.message) ? Response.json({ error: error.message }, { status: error.message === 'forbidden' ? 403 : 401 }) : null,
}))
vi.mock('@/lib/services/party-funnel', () => ({ getPartyFunnel: vi.fn(async (_id, _period, allowed) => ({ allowed })) }))
import { GET } from '@/app/api/marketing/party-funnel/route'
import { getPartyFunnel } from '@/lib/services/party-funnel'
const request = (query: string) => new NextRequest(`http://localhost/api/marketing/party-funnel?${query}`)
describe('party API access boundary', () => {
  it('validates periods and denies unauthenticated/unauthorized reads', async () => {
    expect((await GET(request('studioId=1&startDate=2026-11-15'))).status).toBe(400)
    state.signedIn = false
    expect((await GET(request('studioId=1'))).status).toBe(401)
    state.signedIn = true
    expect((await GET(request('studioId=2'))).status).toBe(403)
    expect(getPartyFunnel).not.toHaveBeenCalled()
  })
  it('passes only authorized studio scope and private cache headers', async () => {
    const response = await GET(request('studioId=1&startDate=2026-11-09&endDate=2026-11-15'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(getPartyFunnel).toHaveBeenCalledWith('1', { startDate: '2026-11-09', endDate: '2026-11-15' }, [1])
  })
})
