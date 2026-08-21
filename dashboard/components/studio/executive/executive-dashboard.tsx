"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  Megaphone,
  Users,
  Utensils,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { ExecutiveDashboardData } from "@/lib/services/executive"
import { LaborSummaryCards } from "@/components/studio/operations/labor-summary-cards"
import { KpiHelp } from "@/components/studio/shared/kpi-help"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const preciseMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

const dateLabel = (value: string) => shortDate.format(new Date(`${value}T00:00:00Z`))
const studioColors = ["#2563eb", "#7c3aed", "#f97316", "#10b981", "#e11d48", "#0891b2"]

type Metric = {
  label: string
  value: string
  change: number | null
  detail: string
  description: string
  icon: typeof CircleDollarSign
  showChange?: boolean
}

function percentChange(current: number, previous: number) {
  return previous ? ((current - previous) / Math.abs(previous)) * 100 : null
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">No prior-period baseline</span>
  const improved = value >= 0
  const Icon = improved ? ArrowUpRight : ArrowDownRight
  return (
    <span className={improved ? "text-emerald-600" : "text-red-600"}>
      <Icon className="mr-1 inline size-3.5" />
      {Math.abs(value).toFixed(1)}% {improved ? "up" : "down"}
    </span>
  )
}

export function ExecutiveDashboard() {
  const { comparison, comparisonDateRange, dateRange, selectedStudio } = useApp()
  const [data, setData] = useState<ExecutiveDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showStudioShares, setShowStudioShares] = useState(true)
  const [weekComparisonMode, setWeekComparisonMode] = useState<"previous" | "custom">("previous")
  const [weekComparisonStart, setWeekComparisonStart] = useState("")
  const [weekComparisonEnd, setWeekComparisonEnd] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          studioId: selectedStudio,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          comparison,
        })
        if (comparison === "custom" && comparisonDateRange) {
          params.set("comparisonStartDate", comparisonDateRange.startDate)
          params.set("comparisonEndDate", comparisonDateRange.endDate)
        }
        if (weekComparisonMode === "custom" && weekComparisonStart && weekComparisonEnd) {
          params.set("weekComparisonStartDate", weekComparisonStart)
          params.set("weekComparisonEndDate", weekComparisonEnd)
        }
        const response = await fetch(`/api/executive/summary?${params}`, {
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setData(result)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "Executive data is unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [comparison, comparisonDateRange, dateRange.endDate, dateRange.startDate, selectedStudio, weekComparisonEnd, weekComparisonMode, weekComparisonStart])

  const metrics = useMemo<Metric[]>(() => {
    if (!data) return []
    const current = data.operations.kpis
    const prior = data.comparison?.kpis
    const marketing = data.marketing.kpis
    const priorMarketing = data.marketingComparison.kpis
    return [
      {
        label: "Total sales",
        value: money.format(current.totalSales),
        change: data.comparison?.changes.totalSales?.percent ?? null,
        detail: `${money.format(current.averageDailySales)} average per day`,
        description: "All recorded sales for the selected studios and date range.",
        icon: CircleDollarSign,
      },
      {
        label: "Seats sold",
        value: current.seatsSold.toLocaleString(),
        change: data.comparison?.changes.seatsSold?.percent ?? null,
        detail: `${current.attendancePercent.toFixed(1)}% capacity`,
        description: "Total seats sold for classes and events in the selected period.",
        icon: Users,
      },
      {
        label: "Revenue per seat",
        value: preciseMoney.format(current.revenuePerSeat),
        change: data.comparison?.changes.revenuePerSeat?.percent ?? null,
        detail: `${preciseMoney.format(current.foodBeveragePerSeat)} F&B per seat`,
        description: "Total sales divided by seats sold, showing average revenue generated per attendee. This helps distinguish growth from higher attendance versus stronger pricing and guest spending; the F&B-per-seat detail isolates average add-on spending.",
        icon: Gauge,
      },
      {
        label: "F&B sales",
        value: money.format(current.foodBeverageSales),
        change: data.comparison?.changes.foodBeverageSales?.percent ?? null,
        detail: `${current.foodBeverageShare.toFixed(1)}% of sales`,
        description: "Sales from food and beverage products during the selected period; the percentage shows their share of total sales. That share reveals the strength of add-on purchasing and helps identify opportunities to improve revenue beyond class tickets.",
        icon: Utensils,
      },
      {
        label: "Meta + Eulerity spend",
        value: money.format(marketing.paidSpend),
        change: percentChange(marketing.paidSpend, priorMarketing.paidSpend),
        detail: `${marketing.sessions.toLocaleString()} website sessions`,
        description: "Total advertising spend reported by Meta and Eulerity during the selected period.",
        icon: Megaphone,
      },
      {
        label: "Attributed revenue",
        value: marketing.attributionAvailable ? money.format(marketing.attributedRevenue) : "—",
        change: marketing.attributionAvailable && priorMarketing.attributionAvailable
          ? percentChange(marketing.attributedRevenue, priorMarketing.attributedRevenue)
          : null,
        detail: marketing.attributionAvailable
          ? `${marketing.attributedRoas.toFixed(2)}x attributed ROAS`
          : "Awaiting attribution data",
        description: "GA4 purchase revenue credited to paid marketing traffic from supported platforms.",
        icon: CircleDollarSign,
      },
      {
        label: "Website sessions",
        value: marketing.sessions.toLocaleString(),
        change: percentChange(marketing.sessions, priorMarketing.sessions),
        detail: `${marketing.keyEvents.toLocaleString()} key events`,
        description: "Total website visits reported by GA4; one visitor may create multiple sessions.",
        icon: Users,
      },
      {
        label: "Average lead time",
        value: `${current.averageLeadTime.toFixed(1)} days`,
        change: prior ? percentChange(current.averageLeadTime, prior.averageLeadTime) : null,
        detail: "Seat-weighted booking lead time",
        description: "Average number of days between a reservation and its event date, weighted by seats booked.",
        icon: CalendarClock,
      },
      {
        label: "Yesterday's booked seats",
        value: data.yesterdayBookings.seats === null
          ? "—"
          : data.yesterdayBookings.seats.toLocaleString(),
        change: null,
        detail: `${dateLabel(data.yesterdayBookings.date)} · gross reservations`,
        description: "Seats reserved yesterday before refunds or cancellations are deducted.",
        icon: Users,
        showChange: false,
      },
      {
        label: "Yesterday's booked sales",
        value: data.yesterdayBookings.sales === null
          ? "—"
          : money.format(data.yesterdayBookings.sales),
        change: null,
        detail: `${dateLabel(data.yesterdayBookings.date)} · gross bookings`,
        description: "Gross reservation-line sales booked yesterday before refunds or cancellations.",
        icon: CircleDollarSign,
        showChange: false,
      },
    ]
  }, [data])

  if (loading) {
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}</div>
  }

  if (error || !data) {
    return <Card className="border-destructive/50"><CardContent><p className="font-semibold text-destructive">We couldn&apos;t load executive performance</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></CardContent></Card>
  }

  const maxStudioSales = Math.max(...data.operations.studioSales.map((studio) => studio.totalSales), 1)
  const comparisonLabel = data.comparison?.label.toLowerCase() ?? "comparison period"
  const trendStudios = data.weeklySales[0]?.studios ?? []
  const weeklyTrend = data.weeklySales.map((week) => {
    const studioValues = Object.fromEntries(
      week.studios.flatMap((studio) => {
        const share = week.sales ? (studio.sales / week.sales) * 100 : 0
        return [
          [`studio_${studio.studioId}`, studio.sales],
          [`studio_${studio.studioId}_share`, share >= 8 ? `${share.toFixed(0)}%` : ""],
        ]
      })
    )
    return {
      label: dateLabel(week.startDate),
      total: week.sales,
      ...studioValues,
    }
  })
  const weeklyChartConfig = Object.fromEntries(
    trendStudios.map((studio, index) => [
      `studio_${studio.studioId}`,
      {
        label: studio.studioName,
        color: studioColors[index % studioColors.length],
      },
    ])
  ) satisfies ChartConfig
  const weekComparison = data.thisWeekComparison
  const partyTotal = data.thisWeek.privateParties + data.thisWeek.mobileEvents
  const comparisonPartyTotal = weekComparison.privateParties === null || weekComparison.mobileEvents === null
    ? null
    : weekComparison.privateParties + weekComparison.mobileEvents
  const comparisonLine = (current: number, previous: number | null, formatter: (value: number) => string) => {
    if (previous === null) return <span className="text-xs text-muted-foreground">No equivalent booking snapshot is available yet.</span>
    const change = percentChange(current, previous)
    return (
      <span className="text-xs text-muted-foreground">
        vs {formatter(previous)} {change === null ? "· no percentage baseline" : `· ${Math.abs(change).toFixed(1)}% ${change >= 0 ? "ahead" : "behind"}`}
      </span>
    )
  }

  return (
    <div className="grid gap-6">
      <LaborSummaryCards />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, change, detail, description, icon: Icon, showChange = true }) => (
          <Card key={label} className="gap-3 py-4">
            <CardHeader className="flex-row items-center justify-between px-4">
              <div className="flex items-center gap-1.5"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle><KpiHelp description={description} /></div>
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              {showChange ? <p className="mt-1 text-xs"><Change value={change} /> <span className="text-muted-foreground">vs {comparisonLabel}</span></p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Weekly sales trend</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Eight completed Monday–Sunday weeks.</p>
            </div>
            <Button
              type="button"
              variant={showStudioShares ? "secondary" : "outline"}
              size="sm"
              aria-pressed={showStudioShares}
              onClick={() => setShowStudioShares((current) => !current)}
            >
              Studio % {showStudioShares ? "on" : "off"}
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-[280px] w-full" config={weeklyChartConfig}>
              <BarChart data={weeklyTrend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => money.format(Number(value))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                {trendStudios.map((studio, index) => {
                  const key = `studio_${studio.studioId}`
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="weekly-sales"
                      fill={`var(--color-${key})`}
                      radius={index === trendStudios.length - 1 ? [5, 5, 0, 0] : 0}
                    >
                      {showStudioShares && (
                        <LabelList
                          dataKey={`${key}_share`}
                          position="center"
                          fill="#ffffff"
                          fontSize={11}
                          fontWeight={600}
                        />
                      )}
                    </Bar>
                  )
                })}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><CardTitle>This week</CardTitle><p className="text-sm text-muted-foreground">{dateLabel(data.thisWeek.startDate)}–{dateLabel(data.thisWeek.endDate)}</p></div>
              <label className="text-xs text-muted-foreground">Compare to
                <select
                  className="mt-1 block h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                  value={weekComparisonMode}
                  onChange={(event) => {
                    const mode = event.target.value as "previous" | "custom"
                    setWeekComparisonMode(mode)
                    if (mode === "custom" && !weekComparisonStart) {
                      setWeekComparisonStart(data.thisWeekComparison.startDate)
                      setWeekComparisonEnd(data.thisWeekComparison.endDate)
                    }
                  }}
                >
                  <option value="previous">Previous week</option>
                  <option value="custom">Custom dates</option>
                </select>
              </label>
            </div>
            {weekComparisonMode === "custom" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">Comparison start<input className="mt-1 block h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground" type="date" value={weekComparisonStart} onChange={(event) => setWeekComparisonStart(event.target.value)} /></label>
                <label className="text-xs text-muted-foreground">Comparison end<input className="mt-1 block h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground" type="date" value={weekComparisonEnd} min={weekComparisonStart} onChange={(event) => setWeekComparisonEnd(event.target.value)} /></label>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Compared with {dateLabel(weekComparison.startDate)}–{dateLabel(weekComparison.endDate)} through {dateLabel(weekComparison.completedThrough)}{weekComparison.snapshotDate ? ` using the ${dateLabel(weekComparison.snapshotDate)} booking snapshot` : " · no booking snapshot available"}.</p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground">Completed sales WTD</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{money.format(data.thisWeek.salesWeekToDate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.thisWeek.completedThrough ? `Through ${dateLabel(data.thisWeek.completedThrough)} · ${data.thisWeek.seatsWeekToDate.toLocaleString()} seats` : "No completed days yet"}</p>
              <p className="mt-2">{comparisonLine(data.thisWeek.salesWeekToDate, weekComparison.salesWeekToDate, money.format)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground">Future booked revenue</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{money.format(data.thisWeek.futureBookedRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.thisWeek.futureBookedSeats.toLocaleString()} seats · {data.thisWeek.futureClasses} classes</p>
              <p className="mt-2">{comparisonLine(data.thisWeek.futureBookedRevenue, weekComparison.futureBookedRevenue, money.format)}</p>
            </div>
            <Link href="/operations/weekly-parties" className="rounded-lg border p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-medium text-muted-foreground">Parties scheduled this week</p><p className="mt-2 text-2xl font-semibold tabular-nums">{partyTotal.toLocaleString()}</p><p className="mt-2">{comparisonLine(partyTotal, comparisonPartyTotal, (value) => `${value.toLocaleString()} parties`)}</p></div>
                <div className="text-right text-sm text-muted-foreground"><p><strong className="text-foreground">{data.thisWeek.privateParties}</strong> private parties</p><p><strong className="text-foreground">{data.thisWeek.mobileEvents}</strong> mobile events</p></div>
              </div>
            </Link>
            <Link href="/operations/upcoming" className="flex items-center justify-end gap-1 text-sm font-medium text-primary sm:col-span-2">View upcoming classes <ArrowRight className="size-4" /></Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div><CardTitle>Studio performance</CardTitle><p className="mt-1 text-sm text-muted-foreground">Sales, seats, and F&B mix for the selected period.</p></div>
            <Link href="/operations" className="flex items-center gap-1 text-sm font-medium text-primary">Operations <ArrowRight className="size-4" /></Link>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.operations.studioSales.map((studio) => (
              <div key={studio.studioId}>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div><p className="font-medium">{studio.studioName}</p><p className="text-xs text-muted-foreground">{studio.seatsSold.toLocaleString()} seats · {studio.foodBeverageShare.toFixed(1)}% F&B</p></div>
                  <p className="font-semibold tabular-nums">{money.format(studio.totalSales)}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(studio.totalSales / maxStudioSales) * 100}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Business mix</CardTitle><p className="text-sm text-muted-foreground">Where selected-period revenue is coming from.</p></CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Class sales", data.operations.kpis.classSales],
              ["Food & beverage", data.operations.kpis.foodBeverageSales],
              ["Other merchandise", data.operations.kpis.merchandiseSales],
              ["Private parties", data.operations.kpis.privatePartySales],
              ["Mobile events", data.operations.kpis.mobileEventSales],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"><span className="text-sm text-muted-foreground">{label}</span><span className="font-medium tabular-nums">{money.format(Number(value))}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Marketing overview</CardTitle><p className="mt-1 text-sm text-muted-foreground">Paid platform investment and attributed performance.</p></div>
          <Link href="/marketing" className="flex items-center gap-1 text-sm font-medium text-primary">Marketing <ArrowRight className="size-4" /></Link>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {data.marketing.channels.map((channel) => (
            <div key={channel.key} className="rounded-lg border p-4"><p className="font-medium">{channel.name}</p><p className="mt-2 text-xl font-semibold tabular-nums">{money.format(channel.spend)}</p><p className="mt-1 text-xs text-muted-foreground">{channel.share.toFixed(1)}% of paid spend · {channel.clicks.toLocaleString()} clicks</p></div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
