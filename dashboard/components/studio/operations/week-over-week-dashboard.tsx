"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarRange, TrendingDown, TrendingUp } from "lucide-react"
import Link from "next/link"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { formatAppliedDateRange, getCompletedDateRange } from "@/lib/date-range"
import type { OperationsDashboardData, WeeklyOperationsHistoryData } from "@/lib/services/operations"

type KpiKey = keyof OperationsDashboardData["kpis"]

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const decimalCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const cards: Array<{ key: KpiKey; label: string; format: "currency" | "decimal" | "number" | "percent" | "days" }> = [
  { key: "totalSales", label: "Total sales", format: "currency" },
  { key: "seatsSold", label: "Seats sold", format: "number" },
  { key: "revenuePerSeat", label: "Revenue / seat", format: "decimal" },
  { key: "foodBeverageSales", label: "F&B sales", format: "currency" },
  { key: "foodBeverageShare", label: "F&B %", format: "percent" },
  { key: "averageLeadTime", label: "Lead time", format: "days" },
]

type HistoryMetricKey = Exclude<keyof WeeklyOperationsHistoryData["rows"][number], "studioId" | "studioName" | "weekStart" | "weekEnd">

const columns: Array<{ key: HistoryMetricKey; label: string; format: "currency" | "decimal" | "number" | "percent" | "days" }> = [
  { key: "totalSales", label: "Total sales", format: "currency" },
  { key: "classSales", label: "Class sales", format: "currency" },
  { key: "foodBeverageSales", label: "F&B", format: "currency" },
  { key: "foodBeverageShare", label: "F&B %", format: "percent" },
  { key: "merchandiseSales", label: "Other product", format: "currency" },
  { key: "seatsSold", label: "Seats", format: "number" },
  { key: "foodBeveragePerSeat", label: "F&B / seat", format: "decimal" },
  { key: "revenuePerSeat", label: "Revenue / seat", format: "decimal" },
  { key: "attendancePercent", label: "Capacity", format: "percent" },
  { key: "averageLeadTime", label: "Lead time", format: "days" },
  { key: "privatePartyEvents", label: "Private", format: "number" },
  { key: "mobileEventCount", label: "Mobile", format: "number" },
  { key: "candleSales", label: "Candles", format: "currency" },
  { key: "artSuppliesSales", label: "Art supplies", format: "currency" },
]

function formatValue(value: number, format: string) {
  if (format === "currency") return currency.format(value)
  if (format === "decimal") return decimalCurrency.format(value)
  if (format === "percent") return `${value.toFixed(1)}%`
  if (format === "days") return `${value.toFixed(1)} days`
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function percentChange(current: number, previous: number) {
  return previous ? ((current - previous) / Math.abs(previous)) * 100 : null
}

function ComparisonValue({ current, previous, format }: { current: number; previous: number; format: string }) {
  const change = percentChange(current, previous)
  const positive = current - previous >= 0
  const Icon = positive ? TrendingUp : TrendingDown

  return (
    <div className="min-w-28 text-right tabular-nums">
      <div className="font-semibold">{formatValue(current, format)}</div>
      <div className="text-xs text-muted-foreground">vs {formatValue(previous, format)}</div>
      <div className={`flex items-center justify-end gap-1 text-xs ${positive ? "text-emerald-700" : "text-red-700"}`}>
        <Icon className="size-3" />
        {change === null ? "New" : `${Math.abs(change).toFixed(1)}% ${positive ? "up" : "down"}`}
      </div>
    </div>
  )
}

export function WeekOverWeekDashboard() {
  const { selectedStudio, studios } = useApp()
  const week = useMemo(() => getCompletedDateRange("lastWeek"), [])
  const [portfolio, setPortfolio] = useState<OperationsDashboardData | null>(null)
  const [history, setHistory] = useState<WeeklyOperationsHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function request(studioId: string) {
      const params = new URLSearchParams({
        studioId,
        startDate: week.startDate,
        endDate: week.endDate,
        comparison: "previous",
      })
      const response = await fetch(`/api/operations/summary?${params}`, { signal: controller.signal })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Week-over-week data is unavailable.")
      return result as OperationsDashboardData
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [portfolioResult, historyResponse] = await Promise.all([
          request(selectedStudio),
          fetch("/api/operations/weekly-history", { signal: controller.signal }),
        ])
        const historyResult = await historyResponse.json()
        if (!historyResponse.ok) throw new Error(historyResult.error || "Weekly history is unavailable.")
        setPortfolio(portfolioResult)
        setHistory(historyResult)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "Week-over-week data is unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    if (studios.length) load()
    return () => controller.abort()
  }, [selectedStudio, studios, week.endDate, week.startDate])

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <Skeleton key={card.key} className="h-32 rounded-xl" />)}</div>
  if (error || !portfolio?.comparison || !history) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error || "Comparison data is unavailable."}</CardContent></Card>

  const visibleHistory = history.rows.filter((row) => selectedStudio === "all" || String(row.studioId) === selectedStudio)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/operations" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Operations Performance</Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarRange className="size-6 text-primary" /> Week-over-Week Comparison</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatAppliedDateRange(week)} compared with {formatAppliedDateRange({ preset: "custom", ...portfolio.comparison.period })}</p>
        </div>
        <StudioSelect />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const current = portfolio.kpis[card.key]
          const previous = portfolio.comparison!.kpis[card.key]
          return <Card key={card.key}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{card.label}</p><ComparisonValue current={current} previous={previous} format={card.format} /></CardContent></Card>
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Weekly operating history</CardTitle><p className="text-sm text-muted-foreground">Every available Mondayâ€“Sunday week for {history.years.join(", ")}. Select a studio above to narrow the ledger.</p></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1900px] text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="sticky left-0 z-10 bg-card px-3 py-3 text-left font-medium">Week</th><th className="px-3 py-3 text-left font-medium">Studio</th>{columns.map((column) => <th key={column.key} className="px-3 py-3 text-right font-medium">{column.label}</th>)}</tr></thead>
              <tbody>{visibleHistory.map((row) => <tr key={`${row.studioId}-${row.weekStart}`} className="border-b last:border-0"><td className="sticky left-0 z-10 bg-card px-3 py-4 font-semibold tabular-nums">{row.weekStart}<div className="text-xs font-normal text-muted-foreground">through {row.weekEnd}</div></td><td className="px-3 py-4 font-medium">{row.studioName}</td>{columns.map((column) => <td key={column.key} className="px-3 py-4 text-right font-medium tabular-nums">{formatValue(row[column.key], column.format)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
