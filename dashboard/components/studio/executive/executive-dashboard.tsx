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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { ExecutiveDashboardData } from "@/lib/services/executive"

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

type Metric = {
  label: string
  value: string
  change: number | null
  detail: string
  icon: typeof CircleDollarSign
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
  }, [comparison, comparisonDateRange, dateRange.endDate, dateRange.startDate, selectedStudio])

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
        icon: CircleDollarSign,
      },
      {
        label: "Seats sold",
        value: current.seatsSold.toLocaleString(),
        change: data.comparison?.changes.seatsSold?.percent ?? null,
        detail: `${current.attendancePercent.toFixed(1)}% capacity`,
        icon: Users,
      },
      {
        label: "Revenue per seat",
        value: preciseMoney.format(current.revenuePerSeat),
        change: data.comparison?.changes.revenuePerSeat?.percent ?? null,
        detail: `${preciseMoney.format(current.foodBeveragePerSeat)} F&B per seat`,
        icon: Gauge,
      },
      {
        label: "F&B sales",
        value: money.format(current.foodBeverageSales),
        change: data.comparison?.changes.foodBeverageSales?.percent ?? null,
        detail: `${current.foodBeverageShare.toFixed(1)}% of sales`,
        icon: Utensils,
      },
      {
        label: "Marketing spend",
        value: money.format(marketing.paidSpend),
        change: percentChange(marketing.paidSpend, priorMarketing.paidSpend),
        detail: `${marketing.sessions.toLocaleString()} website sessions`,
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
        icon: CircleDollarSign,
      },
      {
        label: "Website sessions",
        value: marketing.sessions.toLocaleString(),
        change: percentChange(marketing.sessions, priorMarketing.sessions),
        detail: `${marketing.keyEvents.toLocaleString()} key events`,
        icon: Users,
      },
      {
        label: "Average lead time",
        value: `${current.averageLeadTime.toFixed(1)} days`,
        change: prior ? percentChange(current.averageLeadTime, prior.averageLeadTime) : null,
        detail: "Seat-weighted booking lead time",
        icon: CalendarClock,
      },
    ]
  }, [data])

  if (loading) {
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}</div>
  }

  if (error || !data) {
    return <Card className="border-destructive/50"><CardContent><p className="font-semibold text-destructive">We couldn&apos;t load executive performance</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></CardContent></Card>
  }

  const maxStudioSales = Math.max(...data.operations.studioSales.map((studio) => studio.totalSales), 1)
  const comparisonLabel = data.comparison?.label.toLowerCase() ?? "comparison period"

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, change, detail, icon: Icon }) => (
          <Card key={label} className="gap-3 py-4">
            <CardHeader className="flex-row items-center justify-between px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="mt-1 text-xs"><Change value={change} /> <span className="text-muted-foreground">vs {comparisonLabel}</span></p>
              <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
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
