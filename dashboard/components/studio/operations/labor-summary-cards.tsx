"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Clock3 } from "lucide-react"

import { KpiHelp } from "@/components/studio/shared/kpi-help"
import { Card, CardContent } from "@/components/ui/card"
import { useApp } from "@/contexts/app-context"
import { fetchWithRetry } from "@/lib/http/fetch-with-retry"

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

export function LaborSummaryCards() {
  const { selectedStudio, dateRange } = useApp()
  const [data, setData] = useState<Totals | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchWithRetry(`/api/operations/labor?${new URLSearchParams({ studioId: selectedStudio, startDate: dateRange.startDate, endDate: dateRange.endDate })}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setData(result?.totals ?? null))
      .catch(() => null)
    return () => controller.abort()
  }, [selectedStudio, dateRange.startDate, dateRange.endDate])

  if (!data) return null

  const cards = [
    { label: "Total labor", value: data.totalCost, percent: data.totalPercent, description: "Total actual labor cost, including both class-support and operating-overhead labor, shown with its percentage of sales. The percentage indicates how much revenue is being consumed by staffing and makes labor efficiency comparable across studios and periods of different sizes." },
    { label: "COGS labor", value: data.cogsCost, percent: data.cogsPercent, description: "Actual labor cost for roles mapped to direct class and event support, shown with its percentage of sales. Tracking the percentage helps determine whether direct staffing is scaling appropriately with the revenue those classes and events generate." },
    { label: "Overhead labor", value: data.overheadCost, percent: data.overheadPercent, description: "Actual labor cost for roles mapped to general studio operations, shown with its percentage of sales. This highlights how much revenue is supporting indirect staffing and can reveal overhead that is growing faster than the business." },
  ]

  return <div className="grid gap-4 sm:grid-cols-3">
    {cards.map(({ label, value, percent, description }) => <Card key={label} className="relative h-full transition-colors hover:border-primary/50">
      <KpiHelp description={description} className="absolute right-4 top-4 z-10" />
      <Link href="/operations/labor" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardContent>
          <div className="flex justify-between pr-7"><p className="text-sm text-muted-foreground">{label}</p><Clock3 className="size-4 text-primary" /></div>
          <p className="mt-2 text-2xl font-semibold">{money.format(value)}</p>
          <p className="text-xs text-muted-foreground">{pct(percent)}</p>
        </CardContent>
      </Link>
    </Card>)}
  </div>
}
