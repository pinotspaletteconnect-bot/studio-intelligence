"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { AppliedDateRange } from "@/lib/date-range"
import type { OperationsDashboardData } from "@/lib/services/operations"

type KpiKey = keyof OperationsDashboardData["kpis"]
type Metric = { key: KpiKey; label: string; format: "currency" | "decimal" | "number" | "percent" | "days" }
type PeriodResult = { year: number; range: AppliedDateRange; data: OperationsDashboardData }
type StudioResult = { studioId: number; studioName: string; periods: PeriodResult[] }

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const decimalCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

const operatingMetrics: Metric[] = [
  { key: "totalSales", label: "Total sales", format: "currency" },
  { key: "classSales", label: "Class sales", format: "currency" },
  { key: "seatsSold", label: "Seats sold", format: "number" },
  { key: "revenuePerSeat", label: "Revenue / seat", format: "decimal" },
  { key: "attendancePercent", label: "Capacity", format: "percent" },
  { key: "averageLeadTime", label: "Lead time", format: "days" },
  { key: "foodBeverageSales", label: "F&B sales", format: "currency" },
  { key: "foodBeverageShare", label: "F&B %", format: "percent" },
  { key: "foodBeveragePerSeat", label: "F&B / seat", format: "decimal" },
  { key: "regularSales", label: "Regular", format: "currency" },
  { key: "littleBrushesSales", label: "Little Brushes", format: "currency" },
  { key: "paintItForwardSales", label: "Paint it Forward", format: "currency" },
  { key: "privatePartySales", label: "Private Party", format: "currency" },
  { key: "mobileEventSales", label: "Mobile Events", format: "currency" },
  { key: "noClassSales", label: "No Class", format: "currency" },
  { key: "privatePartyEvents", label: "Private party count", format: "number" },
  { key: "mobileEventCount", label: "Mobile event count", format: "number" },
]

const productMetrics: Metric[] = [
  { key: "liquorSales", label: "Liquor", format: "currency" },
  { key: "wineSales", label: "Wine", format: "currency" },
  { key: "beerSales", label: "Beer", format: "currency" },
  { key: "miscDrinksSales", label: "Misc drinks", format: "currency" },
  { key: "alcoholSpecialSales", label: "Alcohol special", format: "currency" },
  { key: "foodSales", label: "Food", format: "currency" },
  { key: "candleSales", label: "Candles", format: "currency" },
  { key: "artSuppliesSales", label: "Art supplies", format: "currency" },
  { key: "recordedVideosSales", label: "Recorded videos", format: "currency" },
  { key: "framesSales", label: "Frames", format: "currency" },
  { key: "thpkSales", label: "THPK", format: "currency" },
  { key: "miscProductSales", label: "Misc product", format: "currency" },
]

function formatValue(value: number, format: Metric["format"]) {
  if (format === "currency") return currency.format(value)
  if (format === "decimal") return decimalCurrency.format(value)
  if (format === "percent") return `${value.toFixed(1)}%`
  if (format === "days") return `${value.toFixed(1)} days`
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatRange(range: AppliedDateRange) {
  const start = shortDate.format(new Date(`${range.startDate}T00:00:00Z`))
  const end = shortDate.format(new Date(`${range.endDate}T00:00:00Z`))
  return `${start} - ${end}`
}

function shiftDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function shiftCalendarYear(value: string, years: number) {
  const [year, month, day] = value.split("-").map(Number)
  const targetYear = year + years
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate()
  return `${targetYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`
}

function priorYearRange(range: AppliedDateRange, yearsBack: number): AppliedDateRange {
  const weekly = range.preset === "lastWeek"
  return {
    preset: "custom",
    startDate: weekly ? shiftDays(range.startDate, -364 * yearsBack) : shiftCalendarYear(range.startDate, -yearsBack),
    endDate: weekly ? shiftDays(range.endDate, -364 * yearsBack) : shiftCalendarYear(range.endDate, -yearsBack),
  }
}

function ThreeYearValue({ metric, periods }: { metric: Metric; periods: PeriodResult[] }) {
  const [current, previous, older] = periods
  const currentValue = current.data.kpis[metric.key]
  const previousValue = previous.data.kpis[metric.key]
  const delta = previousValue ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : null
  const positive = currentValue >= previousValue
  const Icon = positive ? TrendingUp : TrendingDown

  return <div className="min-w-32 text-right tabular-nums">
    <div className="font-semibold text-foreground"><span className="mr-1.5 text-xs font-medium">{current.year}</span>{formatValue(currentValue, metric.format)}</div>
    <div className="text-[11px] text-muted-foreground">{formatRange(current.range)}</div>
    <div className="mt-1 text-xs text-muted-foreground">{previous.year} {formatValue(previousValue, metric.format)}</div>
    <div className="text-[11px] text-muted-foreground">{formatRange(previous.range)}</div>
    <div className="mt-1 text-xs text-muted-foreground">{older.year} {formatValue(older.data.kpis[metric.key], metric.format)}</div>
    <div className="text-[11px] text-muted-foreground">{formatRange(older.range)}</div>
    <div className={`mt-1 flex items-center justify-end gap-1 text-xs font-medium ${positive ? "text-emerald-700" : "text-red-700"}`}>
      <Icon className="size-3" />
      {delta === null ? "New" : `${Math.abs(delta).toFixed(1)}% ${positive ? "up" : "down"}`}
    </div>
  </div>
}

function ComparisonTable({ title, metrics, studios }: { title: string; metrics: Metric[]; studios: StudioResult[] }) {
  return <Card>
    <CardContent className="pt-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: `${Math.max(1100, 180 + metrics.length * 150)}px` }}>
          <thead><tr className="border-b text-xs text-muted-foreground"><th className="sticky left-0 z-10 bg-card px-3 py-3 text-left font-medium">Studio</th>{metrics.map((metric) => <th key={metric.key} className="px-3 py-3 text-right font-medium">{metric.label}</th>)}</tr></thead>
          <tbody>{studios.map((studio) => <tr key={studio.studioId} className="border-b align-top last:border-0"><td className="sticky left-0 z-10 bg-card px-3 py-4 text-base font-semibold">{studio.studioName}</td>{metrics.map((metric) => <td key={metric.key} className="px-3 py-4"><ThreeYearValue metric={metric} periods={studio.periods} /></td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Scroll horizontally to review all categories. The studio name remains pinned.</p>
    </CardContent>
  </Card>
}

export function WeekOverWeekDashboard() {
  const { selectedStudio, studios, dateRange, setDateRangePreset } = useApp()
  const initialized = useRef(false)
  const [studioResults, setStudioResults] = useState<StudioResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const periods = useMemo(() => [dateRange, priorYearRange(dateRange, 1), priorYearRange(dateRange, 2)], [dateRange])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    setDateRangePreset("lastWeek")
  }, [setDateRangePreset])

  useEffect(() => {
    const controller = new AbortController()
    const visibleStudios = selectedStudio === "all" ? studios : studios.filter((studio) => String(studio.id) === selectedStudio)

    async function request(studioId: number, range: AppliedDateRange) {
      const params = new URLSearchParams({ studioId: String(studioId), startDate: range.startDate, endDate: range.endDate, comparison: "previous" })
      const response = await fetch(`/api/operations/summary?${params}`, { signal: controller.signal })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Period comparison data is unavailable.")
      return result as OperationsDashboardData
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const rows = await Promise.all(visibleStudios.map(async (studio) => ({
          studioId: studio.id,
          studioName: studio.studio_name,
          periods: await Promise.all(periods.map(async (range) => ({
            year: Number(range.startDate.slice(0, 4)),
            range,
            data: await request(studio.id, range),
          }))),
        })))
        setStudioResults(rows)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "Period comparison data is unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    if (studios.length) load()
    return () => controller.abort()
  }, [periods, selectedStudio, studios])

  return (
    <div className="space-y-6">
      <DashboardToolbar
        title="Year-over-Year Period Comparison"
        subtitle="Choose one operating period and compare the same week or calendar dates across three years."
        defaultPreset="lastWeek"
      />
      {loading && <Skeleton className="h-96 rounded-xl" />}
      {error && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent></Card>}
      {!loading && !error && <>
        <ComparisonTable title="Operating performance" metrics={operatingMetrics} studios={studioResults} />
        <ComparisonTable title="Product sales" metrics={productMetrics} studios={studioResults} />
      </>}
    </div>
  )
}
