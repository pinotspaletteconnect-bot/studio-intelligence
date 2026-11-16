'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardToolbar } from '@/components/studio/shared/dashboard-toolbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/app-context'
import { PartyComparisons } from '@/components/studio/marketing/party-comparisons'
import { lastCompleteWeek } from '@/lib/reports/party-funnel'
import type { getPartyFunnel } from '@/lib/services/party-funnel'
type Report = Awaited<ReturnType<typeof getPartyFunnel>>
const number = (v: number | null | undefined) => v == null ? 'Unavailable' : v.toLocaleString()

export function PartyFunnelPage({ initialReport }: { initialReport?: Report }) {
  const { selectedStudio, studios, dateRange, setCustomDateRange } = useApp()
  const [loaded, setLoaded] = useState<Report | null>(initialReport ?? null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const report = loaded?.studioId === selectedStudio && loaded.period.startDate === dateRange.startDate && loaded.period.endDate === dateRange.endDate ? loaded : null
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ studioId: selectedStudio, startDate: dateRange.startDate, endDate: dateRange.endDate })
    fetch(`/api/marketing/party-funnel?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error([401, 403].includes(response.status) ? 'Sign in with access to this studio.' : 'Report could not be loaded. Please retry.')
      const result = await response.json()
      if (!controller.signal.aborted) { setLoaded(result); setError('') }
    }).catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoaded(null) } })
    return () => controller.abort()
  }, [selectedStudio, dateRange.startDate, dateRange.endDate, retry])
  return <div className="party-funnel-report flex flex-col gap-6 p-4 md:p-6 print:p-0">
    <DashboardToolbar title="Private-party website funnel" subtitle="United States traffic: sequential booking steps and inquiries" />
    <p className="text-sm">{selectedStudio === 'all' ? 'Select one studio for a deduplicated funnel' : studios.find(s => String(s.id) === selectedStudio)?.studio_name ?? 'Selected studio'} | {dateRange.startDate} to {dateRange.endDate}</p>
    <div className="flex flex-wrap gap-3 print:hidden"><Button variant="outline" onClick={() => { const p = lastCompleteWeek(); setCustomDateRange(p.startDate, p.endDate) }}>Last complete Monday-Sunday</Button><Button variant="outline" onClick={() => window.print()}>Print / Save PDF</Button><Link className="self-center text-sm underline" href="/operations/ga4">GA4 Analytics</Link></div>
    {error && <div role="alert">{error} <Button onClick={() => setRetry(v => v + 1)}>Retry</Button></div>}
    {!report && !error && <p role="status">Loading report...</p>}
    {report && <>
      <div role="status" className="rounded-lg border bg-muted p-4"><strong>{report.status === 'available' ? 'Sequential data available' : 'Awaiting verified period data'}</strong><p className="text-sm">{report.reason}</p><p className="mt-2 text-xs">{report.freshness} {report.source.retrievedAt && `Retrieved ${report.source.retrievedAt}`}</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Party process views (all steps)', value: report.metrics.views }, { label: 'Period-unique process users', value: report.metrics.periodUniqueUsers }, { label: 'Verified leads submitted', value: report.metrics.verifiedLeads }, { label: 'Verified deposits paid', value: report.metrics.verifiedDeposits }].map(item => <Card key={item.label}><CardHeader><CardTitle className="text-sm">{item.label}</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{number(item.value)}</CardContent></Card>)}</div>
      {report.funnels.map(funnel => <Card key={funnel.name} className="break-inside-avoid"><CardHeader><CardTitle>{funnel.name}</CardTitle></CardHeader><CardContent><ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{funnel.steps.map((step, index) => <li className="rounded-md border p-3" key={step.label}><p className="text-sm font-medium">{index + 1}. {step.label}</p><p className="mt-2 text-sm text-muted-foreground">Active users: {number(step.users)}<br />Next-step drop-off: {index === funnel.steps.length - 1 ? 'Not applicable' : number(step.dropOff)}</p></li>)}</ol></CardContent></Card>)}
      <PartyComparisons report={report} />
      <Card><CardHeader><CardTitle>Party traffic breakdowns</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{!report.traffic ? <p>Device and source / medium data unavailable.</p> : <>{report.traffic.device.map(r => <p key={r.name}>{r.name}: {number(r.views)} views; {number(r.users)} period users</p>)}{report.traffic.sourceMedium.map(r => <p key={`${r.name}-${r.medium}`}>{r.name} / {r.medium}: {number(r.views)} views; {number(r.users)} period users</p>)}</>}<p className="text-xs">These are party-page reach breakdowns, not sequential conversion attribution. Users across rows may overlap and must not be added.</p></CardContent></Card>
    </>}
    <Card className="break-inside-avoid"><CardHeader><CardTitle>Methodology and limits</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Closed sequential funnels begin at Packages, allowing intervening events with no same-session or elapsed-time constraint. Each report covers its whole period. Daily or per-page users cannot reconstruct this sequence.</p><p>Drop-off means not reaching the next step during the period; it does not necessarily mean exiting. Confirmation reached does not verify a deposit payment. Inquiry page reached does not verify lead submission. Party-specific generate_lead / purchase tracking remains unverified.</p><p>Mobile parties skip add-ons and submit a lead at Contact. Party type cannot be isolated from these paths; device category does not identify mobile parties. Adult and kids parties share URLs.</p><p>Views count repeated visits. Period-unique traffic uses GA4 totalUsers; funnel steps use GA4 activeUsers. Known sampled, thresholded, incomplete, or unverified history is unavailable. The alpha funnel API does not expose a thresholding assurance: absence of a warning does not prove threshold-free counts. Geographic scope is United States only (country equals United States), consistently across all periods and reach reports. Missing data is never silently zero.</p></CardContent></Card>
  </div>
}
