import { expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs'
import { PartyFunnelPage } from '@/components/studio/marketing/party-funnel-page'
import { getPartyFunnel, type StoredPeriodRecord } from '@/lib/services/party-funnel'
vi.mock('@/lib/supabase/server', () => ({ supabase: null }))
vi.mock('@/contexts/app-context', () => ({ useApp: () => ({ selectedStudio: '1', studios: [{ id: 1, studio_name: 'St. Matthews' }], dateRange: { preset: 'custom', startDate: '2026-11-09', endDate: '2026-11-15' }, setCustomDateRange: () => {}, setDateRangePreset: () => {}, setSelectedStudio: () => {}, comparison: 'previous', setComparison: () => {} }) }))
it('renders a verified full-period report for print without claiming payment success', async () => {
  const report = await getPartyFunnel('1', { startDate: '2026-11-09', endDate: '2026-11-15' }, [1], async (_id, period): Promise<StoredPeriodRecord> => ({ studioId: '1', period, definitionVersion: 1, availability: 'verified', historyVerified: false, retrievedAt: '2026-11-16T13:00:00Z', routes: { core: [51, 22, 13, 11, 11, 5], addons: [51, 22, 13, 11, 11, 11, 5], inquiry: [51, 12] }, reach: { views: 150, periodUniqueUsers: 60 } }))
  const html = renderToStaticMarkup(createElement(PartyFunnelPage, { initialReport: report }))
  expect(html).toContain('Sequential data available')
  expect(html).toContain('St. Matthews')
  expect(html).toContain('Confirmation reached')
  expect(html).toContain('Verified deposits paid')
  expect(html).toContain('Unavailable')
  expect(html).not.toContain('Infinity')
  if (process.env.PARTY_PREVIEW_PATH) {
    const cssDir = '.next/static/css'
    const css = (existsSync(cssDir) ? readdirSync(cssDir).filter(name => name.endsWith('.css')).map(name => readFileSync(`${cssDir}/${name}`, 'utf8')).join('\n') : '') + readFileSync('app/(app)/marketing/sasha/print.css', 'utf8')
    writeFileSync(process.env.PARTY_PREVIEW_PATH, `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`)
  }
})
