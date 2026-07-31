"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Armchair,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  GlassWater,
  Percent,
  ReceiptText,
  Utensils,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import { useApp } from "@/contexts/app-context"
import type { OperationsDashboardData } from "@/lib/services/operations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

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
const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const studioColors = ["#2563eb", "#7c3aed", "#f97316", "#059669", "#dc2626"]

const cards = [
  { key: "totalSales", label: "Total sales", icon: CircleDollarSign },
  { key: "foodBeverageSales", label: "F&B sales", icon: Utensils },
  { key: "foodBeverageShare", label: "F&B % of sales", icon: Percent },
  { key: "revenuePerSeat", label: "Revenue / seat", icon: ReceiptText },
  { key: "foodBeveragePerSeat", label: "F&B / seat", icon: GlassWater },
  { key: "seatsSold", label: "Seats sold", icon: Armchair },
  { key: "classSales", label: "Class sales", icon: ChartNoAxesCombined },
  { key: "averageDailySales", label: "Average daily sales", icon: CircleDollarSign },
] as const

function formatCard(
  key: (typeof cards)[number]["key"],
  value: number
) {
  if (key === "foodBeverageShare") return `${value.toFixed(1)}%`
  if (key === "seatsSold") return value.toLocaleString()
  if (key === "revenuePerSeat" || key === "foodBeveragePerSeat") {
    return decimalCurrency.format(value)
  }
  return currency.format(value)
}

export function OperationsDashboard() {
  const { selectedStudio, dateRange } = useApp()
  const [data, setData] = useState<OperationsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const studioChart = useMemo(() => {
    if (!data) return { config: {}, rows: [] }

    const rows = new Map<string, Record<string, string | number>>()
    const config: Record<string, { label: string; color: string }> = {}

    data.studioSales.forEach((studio, index) => {
      const key = `studio_${studio.studioId}`
      config[key] = {
        label: studio.studioName,
        color: studioColors[index % studioColors.length],
      }
      studio.daily.forEach((day) => {
        const row = rows.get(day.date) ?? { date: day.date }
        row[key] = day.totalSales
        rows.set(day.date, row)
      })
    })

    return {
      config,
      rows: [...rows.values()].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      ),
    }
  }, [data])

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
        })
        const response = await fetch(`/api/operations/summary?${params}`, {
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setData(result)
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Operations data is unavailable."
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [dateRange.endDate, dateRange.startDate, selectedStudio])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Skeleton key={card.key} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (!data?.daily.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium">No PTS operations data in this period</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose July 28, 2026 or a later completed date after the daily import.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {formatCard(key, data.kpis[key])}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed-day sales</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total sales for each studio on every imported completed day.
          </p>
        </CardHeader>
        <CardContent>
          <ChartContainer
            className="h-[320px] w-full"
            config={studioChart.config}
          >
            <AreaChart data={studioChart.rows}>
              <defs>
                {data.studioSales.map((studio, index) => (
                  <linearGradient
                    key={studio.studioId}
                    id={`studio-fill-${studio.studioId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={studioColors[index % studioColors.length]}
                      stopOpacity={0.24}
                    />
                    <stop
                      offset="95%"
                      stopColor={studioColors[index % studioColors.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => dayLabel.format(new Date(`${value}T00:00:00Z`))}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="dot" />}
              />
              {data.studioSales.map((studio, index) => (
                <Area
                  key={studio.studioId}
                  dataKey={`studio_${studio.studioId}`}
                  name={studio.studioName}
                  type="monotone"
                  stroke={studioColors[index % studioColors.length]}
                  fill={`url(#studio-fill-${studio.studioId})`}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ChartContainer>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {data.studioSales.map((studio, index) => (
              <div key={studio.studioId} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      studioColors[index % studioColors.length],
                  }}
                />
                <span className="text-muted-foreground">
                  {studio.studioName}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Food & beverage drill-down</CardTitle>
            <p className="text-sm text-muted-foreground">
              Expand a subcategory to see the products driving sales.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.foodBeverage.map((group) => (
              <details
                key={group.subcategory}
                className="group rounded-lg border"
              >
                <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3">
                  <span className="font-medium">{group.subcategory}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {group.quantity.toLocaleString()} sold
                  </span>
                  <span className="font-medium tabular-nums">
                    {currency.format(group.sales)}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {group.share.toFixed(1)}%
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="border-t bg-muted/20 px-4 py-2">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className="grid grid-cols-[1fr_auto_auto] gap-4 border-b py-2.5 text-sm last:border-0"
                    >
                      <span>{item.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {item.quantity.toLocaleString()} sold
                      </span>
                      <span className="min-w-20 text-right font-medium tabular-nums">
                        {currency.format(item.sales)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily operating detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 text-right font-medium">Sales</th>
                    <th className="px-2 py-2 text-right font-medium">F&B</th>
                    <th className="px-2 py-2 text-right font-medium">Seats</th>
                    <th className="px-2 py-2 text-right font-medium">Rev/seat</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().map((day) => (
                    <tr key={day.date} className="border-b last:border-0">
                      <td className="px-2 py-3 font-medium">
                        {dayLabel.format(new Date(`${day.date}T00:00:00Z`))}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">
                        {currency.format(day.totalSales)}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">
                        {currency.format(day.foodBeverageSales)}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">
                        {day.seatsSold.toLocaleString()}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">
                        {decimalCurrency.format(day.revenuePerSeat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Merchandise sales for this period:{" "}
              {currency.format(data.kpis.merchandiseSales)}. Average reported
              attendance: {data.kpis.attendancePercent.toFixed(1)}%.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales by class type</CardTitle>
          <p className="text-sm text-muted-foreground">
            Class revenue and attendance grouped into the governed PTS reporting types.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Class type</th>
                  <th className="px-2 py-2 text-right font-medium">Events</th>
                  <th className="px-2 py-2 text-right font-medium">Seats</th>
                  <th className="px-2 py-2 text-right font-medium">Class sales</th>
                  <th className="px-2 py-2 text-right font-medium">Fees</th>
                </tr>
              </thead>
              <tbody>
                {data.classTypes.map((classType) => (
                  <tr key={classType.name} className="border-b last:border-0">
                    <td className="px-2 py-3 font-medium">{classType.name}</td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {classType.events.toLocaleString()}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {classType.seatsSold.toLocaleString()}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {currency.format(classType.classSales)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {currency.format(classType.feeSales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
