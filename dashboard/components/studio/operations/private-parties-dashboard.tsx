"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"
import { useApp } from "@/contexts/app-context"
import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { businessDate } from "@/lib/date-range"
import type { PrivatePartiesData } from "@/lib/services/private-parties"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const pipelineStages = [
  ["Open new leads", "Inquiry + Date Requested", "new"],
  ["Awaiting deposit", "Date Approved", "deposit_requested"],
  ["Booked upcoming", "Manage Party", "booked"],
]

function changeLabel(change: { difference: number; percent: number | null } | null) {
  if (!change) return "Comparison unavailable"
  const amount = `${change.difference > 0 ? "+" : ""}${change.difference.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  return change.percent === null ? `${amount}; prior period was zero` : `${change.percent > 0 ? "+" : ""}${change.percent.toFixed(1)}% (${amount})`
}

export function PrivatePartiesDashboard() {
  const router = useRouter()
  const { selectedStudio, setSelectedStudio, dateRange, setCustomDateRange } = useApp()
  const initialized = useRef(false)
  const [today] = useState(() => businessDate())
  const [start, setStart] = useState(() => `${businessDate().slice(0, 7)}-01`)
  const [end, setEnd] = useState(() => businessDate())
  const [data, setData] = useState<PrivatePartiesData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const leadSummary=!loading&&!error?data?.leads.summary:null

  useEffect(() => {
    let studio = selectedStudio
    let from = dateRange.startDate
    let to = dateRange.endDate
    if (!initialized.current) {
      initialized.current = true
      studio = "all"
      from = `${today.slice(0, 7)}-01`
      to = today
      setSelectedStudio(studio)
      setCustomDateRange(from, to)
    }
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ studioId: studio, startDate: from, endDate: to })
        const response = await fetch(`/api/operations/private-parties?${params}`, { signal: controller.signal })
        if (response.status === 401) { router.push("/login"); return }
        if (response.status === 403) { router.push("/access-pending"); return }
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Unable to load private parties.")
        if (!controller.signal.aborted) setData(result)
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to load private parties.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedStudio, dateRange.startDate, dateRange.endDate, setSelectedStudio, setCustomDateRange, today, router])

  function chooseThisMonth() {
    const first = `${today.slice(0, 7)}-01`
    setStart(first); setEnd(today); setCustomDateRange(first, today)
  }

  return <div className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-5">
      <div><h1 className="text-2xl font-bold">Private Parties</h1><p className="text-sm text-muted-foreground">Leads, conversions, and party value across your studios.</p></div>
      <StudioSelect />
      <div className="flex w-full flex-wrap items-end gap-3">
        <label className="text-sm">From<Input type="date" value={start} min="2024-01-01" max={end} onChange={(event) => setStart(event.target.value)} /></label>
        <label className="text-sm">Through<Input type="date" value={end} min={start} max={today} onChange={(event) => setEnd(event.target.value)} /></label>
        <Button disabled={!start || !end || start < "2024-01-01" || start > end || end > today} onClick={() => setCustomDateRange(start, end)}>Apply</Button>
        <Button variant="outline" onClick={chooseThisMonth}>This month</Button>
        <p className="w-full text-xs text-muted-foreground">Applied: {dateRange.startDate} – {dateRange.endDate}. Choose earlier dates to explore available history.</p>
      </div>
    </div>

    <aside className="rounded-xl border bg-card p-5 text-sm" aria-labelledby="party-calculations">
      <h2 id="party-calculations" className="mb-2 font-semibold">Which month gets the credit?</h2>
      <p>A lead received in September that books in October counts once as a September lead and adds to September’s conversion rate. It is not a new October lead. If the party takes place in November, its party count and actual sales appear in November.</p>
      <p className="mt-2 text-muted-foreground">Conversion = leads received in the selected dates with verified booking evidence ÷ all dated leads received in those dates × 100. Outcomes update with each daily refresh. Estimated booked value = quoted price per guest × minimum expected guests. A range of 10–15 uses 10; 8+ uses 8. Single counts use the stated number. This is a conservative estimate from the latest quote, not final attendance or collected revenue. Actual party revenue = class sales + fees by party date; average party value = revenue ÷ reported parties.</p>
    </aside>

    {!loading && !error && data && <section aria-labelledby="party-year-comparison" className="space-y-3">
      <h2 id="party-year-comparison" className="text-xl font-semibold">Same period in previous years</h2>
      <p className="text-sm text-muted-foreground">Same calendar dates and selected studios, back to 2024. Sales use the same completed-day cutoff in each year. Current pipeline counts are today’s snapshot and are not compared with past years.</p>
      {data.comparisons.length ? <div className="overflow-x-auto rounded-xl border bg-card p-4">
        <table className="w-full min-w-[900px] text-sm"><caption className="mb-3 text-left text-xs text-muted-foreground">Changes compare the selected period with each prior period. Party sales stop at the matched completed-day cutoff shown below each date range.</caption><thead><tr className="border-b text-left">
          <th scope="col" className="py-3 pr-4">Metric</th>
          <th scope="col" className="px-3 text-right align-top">Selected period<span className="mt-1 block text-xs font-normal text-muted-foreground">{data.period.startDate} – {data.period.endDate}</span><span className="block text-xs font-normal text-muted-foreground">Sales through {data.period.salesThrough}</span></th>
          {data.comparisons.map(previous => <Fragment key={previous.yearsAgo}>
            <th scope="col" className="border-l px-3 text-right align-top">{previous.yearsAgo === 1 ? "Prior period" : "Two years prior"}<span className="mt-1 block text-xs font-normal text-muted-foreground">{previous.period.startDate} – {previous.period.endDate}</span><span className="block text-xs font-normal text-muted-foreground">Sales through {previous.period.salesThrough}</span></th>
            <th scope="col" className="px-3 text-right align-top">Change<span className="mt-1 block text-xs font-normal text-muted-foreground">vs. {previous.yearsAgo === 1 ? "prior year" : "two years prior"}</span></th>
          </Fragment>)}
        </tr></thead><tbody>{[
          { label: "Leads received", current: leadSummary?.received ?? "—", previous: data.comparisons.map(previous => [previous.leads?.received ?? "—", changeLabel(previous.changes.leads)]) },
          { label: "Reported parties", current: data.sales.hasSales ? data.sales.events : "—", previous: data.comparisons.map(previous => [previous.sales.hasSales ? previous.sales.events : "—", changeLabel(previous.changes.parties)]) },
          { label: "Party revenue", current: data.sales.hasSales ? money.format(data.sales.revenue) : "—", previous: data.comparisons.map(previous => [previous.sales.hasSales ? money.format(previous.sales.revenue) : "—", previous.changes.revenue ? `${previous.changes.revenue.percent === null ? "No percentage baseline" : `${previous.changes.revenue.percent > 0 ? "+" : ""}${previous.changes.revenue.percent.toFixed(1)}%`} (${money.format(previous.changes.revenue.difference)})` : "Comparison unavailable"]) },
          { label: "Lead conversion to date", current: leadSummary?.conversionRate == null ? "—" : `${leadSummary.conversionRate.toFixed(1)}%`, previous: data.comparisons.map(previous => [previous.leads?.conversionRate == null ? "—" : `${previous.leads.conversionRate.toFixed(1)}%`, previous.changes.conversionPoints == null ? "Comparison unavailable" : `${previous.changes.conversionPoints > 0 ? "+" : ""}${previous.changes.conversionPoints.toFixed(1)} percentage points`]) },
        ].map(row => <tr key={row.label} className="border-b last:border-0"><th scope="row" className="py-3 pr-4 text-left font-normal">{row.label}</th><td className="px-3 text-right tabular-nums">{row.current}</td>{row.previous.map(([value, change], index) => <Fragment key={data.comparisons[index].yearsAgo}><td className="border-l px-3 text-right tabular-nums">{value}</td><td className="px-3 text-right tabular-nums">{change}</td></Fragment>)}</tr>)}</tbody></table>
      </div> : <p className="rounded-xl border p-4 text-sm">No comparable earlier period within the available history beginning January 1, 2024.</p>}
      <p className="text-xs text-muted-foreground">Conversion reflects eventual bookings known today, not what was known on that date last year. Older leads have had longer to convert. Missing inquiry dates are excluded. Missing sales records display —, not zero; available records do not certify complete sales history. February 29 matches February 28 in non-leap years.</p>
    </section>}

    <section aria-labelledby="party-leads" className="space-y-4">
      <div className="space-y-3"><h2 className="text-xl font-semibold">Current pipeline</h2>
        <p className="text-sm text-muted-foreground">All active leads and upcoming booked parties as of the latest refresh. These counts include older and undated inquiries and are not affected by the date filter.</p>
        <div className="grid gap-3 sm:grid-cols-3">{pipelineStages.map(([label, source, key]) => <Card key={label}><CardContent><p className="text-sm font-medium">{label}</p><p className="my-2 text-3xl tabular-nums">{!loading && !error && data?.pipeline.summary ? data.pipeline.summary[key as keyof typeof data.pipeline.summary] : "—"}</p><p className="text-xs text-muted-foreground">{source}</p></CardContent></Card>)}</div>
        {data && !loading && !error && <div className="overflow-x-auto rounded-xl border bg-card p-4"><table className="w-full min-w-[420px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Studio</th><th className="text-right">Open leads</th><th className="text-right">Awaiting deposit</th><th className="text-right">Booked upcoming</th></tr></thead><tbody>{data.pipeline.studios.map(studio => <tr key={studio.id} className="border-b last:border-0"><td className="py-3">{studio.name}</td><td className="text-right">{studio.counts?.new ?? "—"}</td><td className="text-right">{studio.counts?.deposit_requested ?? "—"}</td><td className="text-right">{studio.counts?.booked ?? "—"}</td></tr>)}</tbody></table></div>}
      </div>
      <h2 id="party-leads" className="text-xl font-semibold">Leads & conversion</h2>
      {!loading&&!error&&data?.leads.status!=="complete"&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Historical import coverage: {data?.leads.studiosCovered??0} of {data?.leads.studiosRequested??0} studios complete. Portfolio conversion stays unavailable until every selected studio is reconciled. Lead history begins January 1, 2024.</div>}
      <div className="grid gap-3 sm:grid-cols-3">{[
        ["Leads received",leadSummary?leadSummary.received.toLocaleString():"—"],
        ["Verified lead conversion",leadSummary?.conversionRate==null?"—":`${leadSummary.conversionRate.toFixed(1)}%`],
        ["Estimated booked value (minimum guests)",leadSummary&&leadSummary.valuedBookings?money.format(leadSummary.estimatedBookedValue):"—"],
      ].map(([label,value])=><Card key={label}><CardContent><p className="text-sm font-medium">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
      {leadSummary&&<p className="text-xs text-muted-foreground">{leadSummary.converted} of {leadSummary.received} leads received in this period have booked as of the latest import. Minimum-guest estimates include {leadSummary.valuedBookings} of {leadSummary.converted} converted parties. {leadSummary.unvaluedBookings} are excluded because price or attendance is missing or unreadable. Ranges use their lower count (10–15 → 10; 8+ → 8). Estimates are not collected revenue.</p>}
      {Boolean(data?.leads.unknownDateCount)&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{data?.leads.unknownDateCount} imported leads have no verifiable original inquiry date. They are excluded from date-filtered lead counts and conversion rates. These rates describe the dated lead cohort.</p>}
      <p className="text-sm text-muted-foreground">Outcomes of leads received in the selected period</p>
      <div className="grid gap-3 sm:grid-cols-2">{[["Completed", "completed"], ["Lost", "lost"]].map(([label, key]) => <Card key={key}><CardContent><p className="text-sm font-medium">{label}</p><p className="my-2 text-3xl tabular-nums">{leadSummary ? leadSummary.stages[key] : "—"}</p></CardContent></Card>)}</div>
      {leadSummary&&leadSummary.stages.unknown>0&&<p className="text-xs text-muted-foreground">{leadSummary.stages.unknown} older leads have no current Party Planner stage. Legacy Confirmed status is retained as booking evidence.</p>}
      {data?.leads.coverage.length? <details className="rounded-xl border bg-card p-4 text-sm"><summary className="cursor-pointer font-medium">Import freshness and historical limits</summary><div className="mt-3 space-y-2 text-muted-foreground">{data.leads.coverage.map(row=><p key={row.studio_id}>Studio {row.studio_id}: {row.loaded_count} leads reconciled; imported {row.completed_at}. History from {row.history_from}; {row.unknown_date_count??0} without a verified original date.</p>)}<p>The source does not expose historical stage-change timestamps. Conversion shows verified bookings, including completed parties and legacy Confirmed records, as of import. A lost lead is counted as converted only when earlier booking evidence exists. Historical bookings by booking date and deposit-request conversion are unavailable.</p></div></details>:null}
      {data&&data.studios.some(studio=>studio.leads)&&<div className="overflow-x-auto rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">Lead conversion by studio</h3><p className="mb-3 text-xs text-muted-foreground">Estimated booked value uses quoted price × minimum expected guests. Ranges use the lower count; missing or unreadable quotes are excluded. Coverage is shown for each studio.</p><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Studio</th><th className="text-right">Dated leads</th><th className="text-right">Converted</th><th className="text-right">Conversion</th><th className="text-right">Estimated booked value</th></tr></thead><tbody>{data.studios.map(studio=><tr key={studio.id} className="border-b last:border-0"><td className="py-3">{studio.name}</td><td className="text-right">{studio.leads?.received??"—"}</td><td className="text-right">{studio.leads?.converted??"—"}</td><td className="text-right">{studio.leads?.conversionRate==null?"—":`${studio.leads.conversionRate.toFixed(1)}%`}</td><td className="text-right">{studio.leads?.valuedBookings?money.format(studio.leads.estimatedBookedValue):"—"}{studio.leads && <p className="mt-1 text-xs text-muted-foreground">{studio.leads.valuedBookings} of {studio.leads.converted} bookings valued{studio.leads.unvaluedBookings > 0 ? ` · Incomplete: ${studio.leads.unvaluedBookings} excluded` : ""}</p>}</td></tr>)}</tbody></table></div>}
      {data?.leads.monthly.length? <div className="overflow-x-auto rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">Lead conversion by inquiry month</h3><table className="w-full min-w-[440px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Month</th><th className="text-right">Leads</th><th className="text-right">Converted</th><th className="text-right">Conversion</th></tr></thead><tbody>{data.leads.monthly.map(month=><tr key={month.month} className="border-b last:border-0"><td className="py-3">{month.month}</td><td className="text-right">{month.received}</td><td className="text-right">{month.converted}</td><td className="text-right">{month.conversionRate?.toFixed(1)}%</td></tr>)}</tbody></table></div>:null}
      <details className="rounded-xl border bg-card p-4 text-sm"><summary className="cursor-pointer font-medium">How leads, conversions, and value are measured</summary><div className="mt-3 space-y-2 text-muted-foreground"><p>Incoming leads are counted once by their original inquiry date, including leads that have since booked or completed. Inquiry and Date Requested are the current new-lead stages.</p><p>Date Approved means a deposit has been requested. Manage Party means booked; Close Party means completed. Dispositioned leads are lost. A completed party remains a successful booking conversion.</p><p>Conversion is the share of leads received in the selected period that eventually book, measured through the latest import. Recent periods may still have open leads. Cancellations after booking must be reported separately.</p><p>Booking value and estimated pipeline value require verified lead records. Historical party sales below are class sales plus fees by event date; product sales are excluded. Deposit amounts are not used as a substitute for revenue.</p></div></details>
    </section>

    <section aria-labelledby="party-sales" className="space-y-4" aria-busy={loading}>
      <div><h2 id="party-sales" className="text-xl font-semibold">Historical party sales</h2><p className="text-sm text-muted-foreground">Available completed-day Class Sales history. These counts are separate from lead stages.</p></div>
      {loading ? <p role="status" className="rounded-xl border bg-card p-6">Loading party history…</p> : error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">{error}</p> : data ? <>
        <p className="text-xs text-muted-foreground">Sales through {data.period.salesThrough}. Dates with records in this selection: {data.coverage.firstDate ?? "none"}{data.coverage.lastDate ? ` – ${data.coverage.lastDate}` : ""}. This does not certify complete import coverage.</p>
        <div className="grid gap-3 sm:grid-cols-3">{[
          ["Reported parties", data.sales.hasSales ? data.sales.events.toLocaleString() : "—"],
          ["Party revenue", data.sales.hasSales ? money.format(data.sales.revenue) : "—"],
          ["Average party value", data.sales.averageValue === null ? "—" : money.format(data.sales.averageValue)],
        ].map(([label, value]) => <Card key={label}><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
        {!data.sales.hasSales && <p className="text-sm text-muted-foreground">No party-sales records are available for this selection. Missing history does not mean there were no parties.</p>}
        <div className="overflow-x-auto rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">Studio comparison</h3><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Studio</th><th className="text-right">Parties</th><th className="text-right">Revenue</th><th className="text-right">Average value</th></tr></thead><tbody>{data.studios.map((studio) => <tr key={studio.id} className="border-b last:border-0"><td className="py-3">{studio.name}</td><td className="text-right tabular-nums">{studio.hasSales ? studio.events : "—"}</td><td className="text-right tabular-nums">{studio.hasSales ? money.format(studio.revenue) : "—"}</td><td className="text-right tabular-nums">{studio.averageValue === null ? "—" : money.format(studio.averageValue)}</td></tr>)}</tbody></table></div>
        {data.monthly.length > 0 && <div className="overflow-x-auto rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">Monthly history</h3><table className="w-full min-w-[440px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Month</th><th className="text-right">Parties</th><th className="text-right">Revenue</th><th className="text-right">Average value</th></tr></thead><tbody>{data.monthly.map((month) => <tr key={month.month} className="border-b last:border-0"><td className="py-3">{month.month}</td><td className="text-right tabular-nums">{month.events}</td><td className="text-right tabular-nums">{money.format(month.revenue)}</td><td className="text-right tabular-nums">{month.averageValue === null ? "—" : money.format(month.averageValue)}</td></tr>)}</tbody></table></div>}
        <Link href="/operations/private-parties/events" className="inline-block text-sm underline">View individual party sales</Link>
      </> : null}
    </section>
  </div>
}
