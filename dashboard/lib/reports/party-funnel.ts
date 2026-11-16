export type Period = { startDate: string; endDate: string }
const day = 86400000
const iso = (value: Date) => value.toISOString().slice(0, 10)
const shift = (value: string, days: number) => iso(new Date(Date.parse(value) + days * day))

export function previousPeriod(period: Period): Period {
  const length = (Date.parse(period.endDate) - Date.parse(period.startDate)) / day + 1
  return { startDate: shift(period.startDate, -length), endDate: shift(period.startDate, -1) }
}

export function lastCompleteWeek(now = new Date()): Period {
  const local = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const today = new Date(`${local}T00:00:00Z`)
  const daysSinceMonday = (today.getUTCDay() + 6) % 7
  const endDate = shift(iso(today), -daysSinceMonday - 1)
  return { startDate: shift(endDate, -6), endDate }
}

export function partyFunnelReport(studioId: string, period: Period) {
  const rolling = { startDate: shift(period.endDate, -27), endDate: period.endDate }
  return {
    version: 2,
    definitionVersion: 2,
    geography: 'US' as const,
    studioId,
    status: 'unavailable' as 'available' | 'unavailable' | 'limited',
    reason: studioId === 'all'
      ? 'Select one studio. Cross-property unique users cannot be deduplicated.'
      : 'No verified exact-period party report is available for these dates. Daily GA4 totals cannot reconstruct this funnel; a whole-period import is required.',
    period,
    previous: previousPeriod(period),
    rolling,
    rollingPrevious: previousPeriod(rolling),
    yearOverYear: { status: 'unavailable', reason: 'Comparable flow history has not been verified.' },
    freshness: 'Recent GA4 periods may be provisional while processing completes.',
    metrics: { views: null as number | null, periodUniqueUsers: null as number | null, verifiedLeads: null, verifiedDeposits: null },
    breakdowns: { device: null, sourceMedium: null },
    funnels: [
      { name: 'Core booking path', steps: ['Packages', 'Event details', 'Choose date', 'Contact', 'Checkout reached', 'Confirmation reached'] },
      { name: 'Studio / add-ons path', steps: ['Packages', 'Event details', 'Choose date', 'Add-ons', 'Contact', 'Checkout reached', 'Confirmation reached'] },
      { name: 'Inquiry alternative', steps: ['Packages', 'Inquiry page reached'] },
    ].map(funnel => ({ ...funnel, steps: funnel.steps.map(label => ({ label, users: null as number | null, dropOff: null as number | null })) })),
    source: { availability: 'unavailable' as 'verified' | 'unavailable', retrievedAt: null as string | null, historyVerified: false },
  }
}

// Read-only port for an authorized reporting-view service. No production source
// is assumed. The reader must enforce tenant/studio authorization before use.
export type VerifiedPeriodRecord = {
  studioId: string; period: Period; definitionVersion: 2; geography: 'US'
  availability: 'verified'; historyVerified: boolean; retrievedAt: string
  routes: { core: number[]; addons: number[]; inquiry: number[] }
  reach: { views: number; periodUniqueUsers: number } | null
}
export function applyVerifiedPeriod(report: ReturnType<typeof partyFunnelReport>, record: VerifiedPeriodRecord) {
  if (record.availability !== 'verified' || record.definitionVersion !== 2 || record.geography !== 'US' || record.studioId !== report.studioId || report.studioId === 'all' || record.period.startDate !== report.period.startDate || record.period.endDate !== report.period.endDate || !Number.isFinite(Date.parse(record.retrievedAt))) throw new Error('Unverified or mismatched period record')
  const routes = [record.routes.core, record.routes.addons, record.routes.inquiry]
  if (routes.some((counts, index) => counts.length !== report.funnels[index].steps.length || counts.some((value, i) => !Number.isSafeInteger(value) || value < 0 || (i > 0 && value > counts[i - 1])))) throw new Error('Invalid sequential record')
  if (record.reach && Object.values(record.reach).some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Invalid reach record')
  return { ...report, status: 'available' as const, reason: 'Verified whole-period sequential users. Paid deposits and submitted leads remain unverified.',
    source: { availability: 'verified' as const, retrievedAt: record.retrievedAt, historyVerified: record.historyVerified },
    metrics: { ...report.metrics, views: record.reach?.views ?? null, periodUniqueUsers: record.reach?.periodUniqueUsers ?? null },
    funnels: report.funnels.map((funnel, index) => ({ ...funnel, steps: funnel.steps.map((step, i) => ({ ...step, users: routes[index][i], dropOff: i === routes[index].length - 1 ? null : routes[index][i] - routes[index][i + 1] })) })),
  }
}
