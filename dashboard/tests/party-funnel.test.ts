import { describe, expect, it, vi } from 'vitest'
import { getPartyFunnel, readStoredPeriod, type StoredPeriodRecord } from '@/lib/services/party-funnel'
const state = vi.hoisted(() => ({ client: null as unknown }))
vi.mock('@/lib/supabase/server', () => ({ get supabase() { return state.client } }))
const period = { startDate: '2026-11-09', endDate: '2026-11-15' }
const makeRecord = (p: typeof period, count: number): StoredPeriodRecord => ({ studioId: '1', period: p, definitionVersion: 2, geography: 'US', availability: 'verified', historyVerified: true, retrievedAt: '2026-11-16T13:00:00Z', routes: { core: Array(6).fill(count), addons: Array(7).fill(count), inquiry: [count, count] }, reach: { views: count * 10, periodUniqueUsers: count } })
describe('private party exact-period service', () => {
  it('pairs unequal selected/rolling durations and returns every step and reach comparison', async () => {
    const read = vi.fn(async (_id, p) => makeRecord(p, p.startDate === '2026-11-09' ? 20 : p.startDate === '2026-11-02' ? 10 : p.startDate === '2026-10-19' ? 80 : p.startDate === '2026-09-21' ? 40 : 5))
    const report = await getPartyFunnel('1', period, [1], read)
    expect(read).toHaveBeenCalledTimes(5)
    expect(report.comparisons[1].change).toBe(100)
    expect(report.comparisons[3].change).toBe(100)
    expect(report.comparisons[3].pairLabel).toContain('Rolling 28')
    expect(report.comparisons[3].stepChanges?.[1].steps).toHaveLength(7)
    expect(report.comparisons[3].stepChanges?.[1].steps[0]).toEqual({ absolute: 40, percent: 100 })
    expect(report.comparisons[3].reachChanges?.views).toEqual({ absolute: 400, percent: 100 })
  })
  it('denies unauthorized studio before any read and does not combine properties', async () => {
    const read = vi.fn()
    await expect(getPartyFunnel('2', period, [1], read)).rejects.toThrow('access denied')
    expect((await getPartyFunnel('all', period, [1], read)).status).toBe('unavailable')
    expect(read).not.toHaveBeenCalled()
  })
  it('keeps empty data, unverified history, and zero-baseline percentage unavailable', async () => {
    const empty = await getPartyFunnel('1', period, [1], async () => null)
    expect(empty.metrics.views).toBeNull()
    const report = await getPartyFunnel('1', period, [1], async (_id, p) => ({ ...makeRecord(p, 0), historyVerified: false }))
    expect(report.comparisons[1].change).toBeNull()
    expect(report.comparisons[1].stepChanges?.[0].steps[0]?.percent).toBeNull()
    expect(report.comparisons[4].available).toBe(false)
    expect(report.metrics.verifiedLeads).toBeNull()
  })
  it('rejects mismatched and malformed stored reports', async () => {
    await expect(getPartyFunnel('1', period, [1], async (_id, p) => ({ ...makeRecord(p, 2), studioId: '2' }))).rejects.toThrow('mismatched')
    await expect(getPartyFunnel('1', period, [1], async (_id, p) => ({ ...makeRecord(p, 2), routes: { core: [1], addons: [], inquiry: [] } }))).rejects.toThrow('Invalid sequential')
  })
  it('keeps current verified users while prior no-row coverage and all growth metrics stay unavailable', async () => {
    const report = await getPartyFunnel('1', period, [1], async (_id, p) => p.startDate === period.startDate && p.endDate === period.endDate ? makeRecord(p, 51) : null)
    expect(report.status).toBe('available')
    expect(report.funnels[0].steps[0].users).toBe(51)
    expect(report.comparisons[1].packagesActiveUsers).toBeNull()
    expect(report.comparisons[1].available).toBe(false)
    expect(report.comparisons[1].change).toBeNull()
    expect(report.comparisons[1].stepChanges).toBeNull()
    expect(report.comparisons[1].reachChanges).toBeNull()
  })
  it('requests only v2 United States stored periods and rejects legacy cached records', async () => {
    const filters: unknown[][] = []
    const query = { select: () => query, eq: (...args: unknown[]) => { filters.push(args); return query }, maybeSingle: async () => ({ data: { report: { ...makeRecord(period, 2), definitionVersion: 1, geography: 'all' } }, error: null }) }
    state.client = { from: () => query }
    await expect(readStoredPeriod('1', period)).rejects.toThrow()
    expect(filters).toContainEqual(['definition_version', 2])
    expect(filters).toContainEqual(['geography', 'US'])
    const legacy = { ...makeRecord(period, 2), geography: 'all' } as unknown as StoredPeriodRecord
    await expect(getPartyFunnel('1', period, [1], async () => legacy)).rejects.toThrow('mismatched')
  })
})
