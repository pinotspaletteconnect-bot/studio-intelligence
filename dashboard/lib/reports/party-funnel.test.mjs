import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lastCompleteWeek, previousPeriod, partyFunnelReport, applyVerifiedPeriod } from './party-funnel.ts'

test('Monday report uses the preceding complete Eastern week across DST', () => {
  assert.deepEqual(lastCompleteWeek(new Date('2026-11-16T13:00:00Z')), { startDate: '2026-11-09', endDate: '2026-11-15' })
  assert.deepEqual(lastCompleteWeek(new Date('2026-03-09T12:00:00Z')), { startDate: '2026-03-02', endDate: '2026-03-08' })
  assert.deepEqual(lastCompleteWeek(new Date('2026-11-16T02:00:00Z')), { startDate: '2026-11-02', endDate: '2026-11-08' })
})
test('inclusive comparisons cross month/year boundaries', () => {
  assert.deepEqual(previousPeriod({ startDate: '2026-01-01', endDate: '2026-01-07' }), { startDate: '2025-12-25', endDate: '2025-12-31' })
})
test('unknown outcomes remain null and rolling periods do not overlap', () => {
  const report = partyFunnelReport('1', { startDate: '2026-11-09', endDate: '2026-11-15' })
  assert.equal(report.status, 'unavailable')
  assert.equal(report.metrics.verifiedDeposits, null)
  assert.equal(report.metrics.verifiedLeads, null)
  assert.equal(report.rolling.startDate, '2026-10-19')
  assert.equal(report.rollingPrevious.endDate, '2026-10-18')
  assert.equal(report.yearOverYear.status, 'unavailable')
  assert.match(partyFunnelReport('all', report.period).reason, /Select one studio/)
})
test('authorized reader records render counts only for exact verified studio/period', () => {
  const report = partyFunnelReport('1', { startDate: '2026-11-09', endDate: '2026-11-15' })
  const record = { studioId: '1', period: report.period, definitionVersion: 2, geography: 'US', availability: 'verified', historyVerified: false, retrievedAt: '2026-11-16T13:00:00Z', routes: { core: [10, 8, 5, 3, 1, 1], addons: [5, 4, 3, 2, 1, 1, 1], inquiry: [10, 2] }, reach: null }
  const result = applyVerifiedPeriod(report, record)
  assert.equal(result.funnels[0].steps[0].users, 10)
  assert.equal(result.funnels[0].steps[0].dropOff, 2)
  assert.equal(result.metrics.verifiedDeposits, null)
  assert.equal(result.yearOverYear.status, 'unavailable')
  assert.equal(result.source.historyVerified, false)
  assert.throws(() => applyVerifiedPeriod(report, { ...record, studioId: '2' }))
  assert.throws(() => applyVerifiedPeriod(report, { ...record, availability: 'unavailable' }))
  assert.throws(() => applyVerifiedPeriod(report, { ...record, definitionVersion: 1 }))
  assert.throws(() => applyVerifiedPeriod(report, { ...record, geography: 'all' }))
  assert.equal(result.geography, 'US')
})
