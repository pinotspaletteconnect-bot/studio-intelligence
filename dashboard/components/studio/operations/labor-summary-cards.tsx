"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Clock3 } from "lucide-react"

import { StudioMetricBreakdown } from "@/components/studio/shared/studio-metric-breakdown"
import { KpiHelp } from "@/components/studio/shared/kpi-help"
import { Card, CardContent } from "@/components/ui/card"
import { useApp } from "@/contexts/app-context"

type Totals = {
  totalCost: number
  cogsCost: number
  overheadCost: number
  unmappedCost: number
  totalPercent: number | null
  cogsPercent: number | null
  overheadPercent: number | null
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const pct = (value: number | null) => value === null ? "N/A" : `${value.toFixed(1)}% of sales`

export function LaborSummaryCards({ showStudioBreakdown = false }: { showStudioBreakdown?: boolean }) {
  const { selectedStudio, dateRange, studios } = useApp()
  const [data, setData] = useState<{ requestKey: string; totals: Totals; studios: Array<Omit<Totals, "unmappedCost"> & { studioId: number }> } | null>(null)

  const requestKey = `${selectedStudio}:${dateRange.startDate}:${dateRange.endDate}`
  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/operations/labor?${new URLSearchParams({ studioId: selectedStudio, startDate: dateRange.startDate, endDate: dateRange.endDate })}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (!controller.signal.aborted) setData(result ? { ...result, requestKey } : null) })
      .catch(() => null)
    return () => controller.abort()
  }, [selectedStudio, dateRange.startDate, dateRange.endDate, requestKey])

  if (!data || data.requestKey !== requestKey) return null

  const cards = [
    { key: "totalCost" as const, percentKey: "totalPercent" as const, label: "Total labor", value: data.totals.totalCost, percent: data.totals.totalPercent, description: "Total actual labor cost, including both class-support and operating-overhead labor, shown with its percentage of sales. The percentage indicates how much revenue is being consumed by staffing and makes labor efficiency comparable across studios and periods of different sizes." },
    { key: "cogsCost" as const, percentKey: "cogsPercent" as const, label: "COGS labor", value: data.totals.cogsCost, percent: data.totals.cogsPercent, description: "Actual labor cost for roles mapped to direct class and event support, shown with its percentage of sales. Tracking the percentage helps determine whether direct staffing is scaling appropriately with the revenue those classes and events generate." },
    { key: "overheadCost" as const, percentKey: "overheadPercent" as const, label: "Overhead labor", value: data.totals.overheadCost, percent: data.totals.overheadPercent, description: "Actual labor cost for roles mapped to general studio operations, shown with its percentage of sales. This highlights how much revenue is supporting indirect staffing and can reveal overhead that is growing faster than the business." },
  ]

  const showStudios = showStudioBreakdown && selectedStudio === "all"

  return <div className={`grid gap-4 ${showStudios ? "lg:grid-cols-3" : "sm:grid-cols-3"}`}>
    {cards.map(({ key, percentKey, label, value, percent, description }) => <Card key={label} className="@container relative h-full transition-colors hover:border-primary/50">
      <KpiHelp description={description} className="absolute right-4 top-4 z-10" />
      <Link href="/operations/labor" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardContent className={`grid gap-4 ${showStudios ? "pr-10 @min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : ""}`}>
          <div>
          <div className="flex justify-between pr-7"><p className="text-sm text-muted-foreground">{label}</p><Clock3 className="size-4 text-primary" /></div>
          <p className="mt-2 text-2xl font-semibold">{money.format(value)}</p>
          <p className="text-xs text-muted-foreground">{pct(percent)}</p>
          </div>
          {showStudios ? <StudioMetricBreakdown label={label} rows={studios.map((studio) => {
            const row = data.studios.find((item) => item.studioId === studio.id)
            return { studioId: studio.id, studioName: studio.studio_name, value: row ? money.format(row[key]) : "—", detail: row ? pct(row[percentKey]) : undefined }
          })} /> : null}
        </CardContent>
      </Link>
    </Card>)}
  </div>
}
