import { z } from 'zod'
import { supabase } from '@/lib/supabase/server'
import { resolveReportPeriod } from '@/lib/date-range'
import { applyVerifiedPeriod, lastCompleteWeek, partyFunnelReport, type Period } from '@/lib/reports/party-funnel'

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const recordSchema = z.object({
  studioId: z.string(), period: z.object({ startDate: z.iso.date(), endDate: z.iso.date() }),
  definitionVersion: z.literal(2), geography: z.literal('US'), availability: z.literal('verified'), historyVerified: z.boolean(), retrievedAt: z.iso.datetime(),
  routes: z.object({ core: z.array(count).length(6), addons: z.array(count).length(7), inquiry: z.array(count).length(2) }),
  reach: z.object({ views: count, periodUniqueUsers: count }).nullable(),
  breakdowns: z.object({ device: z.array(z.object({ name: z.string(), views: count, users: count })), sourceMedium: z.array(z.object({ name: z.string(), medium: z.string(), views: count, users: count })) }).optional(),
})
export type StoredPeriodRecord = z.infer<typeof recordSchema>
export type PeriodReader = (studioId: string, period: Period) => Promise<StoredPeriodRecord | null>

export const readStoredPeriod: PeriodReader = async (studioId, period) => {
  const { data, error } = await supabase.from('ga4_party_funnel_reporting').select('report')
    .eq('studio_id', studioId).eq('period_start', period.startDate).eq('period_end', period.endDate).eq('definition_version', 2).eq('geography', 'US').maybeSingle()
  // Unapplied proposal / uncached view is an explicit awaiting-setup state.
  if (error?.code === '42P01' || error?.code === 'PGRST205') return null
  if (error) throw new Error('Party reporting read failed')
  if (!data) return null
  return recordSchema.parse(data.report)
}

const shiftYear = (period: Period): Period | null => {
  const shift = (date: string) => `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`
  const result = { startDate: shift(period.startDate), endDate: shift(period.endDate) }
  return Object.values(result).every(value => new Date(value).toISOString().slice(0, 10) === value) ? result : null
}
export async function getPartyFunnel(studioId = 'all', period: Period = lastCompleteWeek(), allowedStudioIds: number[] = [], reader: PeriodReader = readStoredPeriod) {
  resolveReportPeriod(period.startDate, period.endDate)
  const report = partyFunnelReport(studioId, period)
  if (studioId === 'all') return { ...report, comparisons: [], traffic: null }
  if (!allowedStudioIds.includes(Number(studioId))) throw new Error('Studio access denied')
  const yoy = shiftYear(period)
  const periods = [period, report.previous, report.rolling, report.rollingPrevious, yoy]
  const records = await Promise.all(periods.map(value => value ? reader(studioId, value) : null))
  const current = records[0] ? applyVerifiedPeriod(report, records[0]) : report
  const comparisons = ['Selected period', 'Previous equal period', 'Rolling 28 days', 'Previous 28 days', 'Year over year'].map((label, index) => {
    const record = records[index]
    const comparable = index !== 4 || Boolean(record?.historyVerified && records[0]?.historyVerified)
    const validated = record && periods[index] && comparable ? applyVerifiedPeriod(partyFunnelReport(studioId, periods[index]!), record) : null
    const value = validated?.funnels[0].steps[0].users ?? null
    const numerator = index === 3 ? records[2] : records[0]
    const selected = numerator?.routes.core[0] ?? null
    const delta = (value: number | null | undefined, baseline: number | null | undefined) => value == null || baseline == null ? null : { absolute: value - baseline, percent: baseline === 0 ? null : (value - baseline) / baseline * 100 }
    const isComparison = [1, 3, 4].includes(index) && Boolean(validated && numerator)
    return { label, period: periods[index], available: Boolean(validated), packagesActiveUsers: value,
      change: ![1, 3, 4].includes(index) || !value || selected === null ? null : (selected - value) / value * 100,
      pairLabel: index === 3 ? 'Rolling 28 days vs previous 28 days' : index === 4 ? 'Selected vs comparable prior year' : index === 1 ? 'Selected vs previous equal period' : null,
      stepChanges: isComparison ? (['core', 'addons', 'inquiry'] as const).map(route => ({ route, steps: numerator!.routes[route].map((value, i) => delta(value, record!.routes[route][i])) })) : null,
      reachChanges: isComparison ? { views: delta(numerator?.reach?.views, record?.reach?.views), users: delta(numerator?.reach?.periodUniqueUsers, record?.reach?.periodUniqueUsers) } : null,
      reach: validated?.metrics ?? null,
      funnels: validated?.funnels ?? null }
  })
  return { ...current, comparisons, traffic: records[0]?.breakdowns ?? null }
}
