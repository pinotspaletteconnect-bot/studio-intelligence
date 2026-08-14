"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, CalendarDays } from "lucide-react"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { DailyOperatingDetailData } from "@/lib/services/operations"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
})
const dateLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})
const timeLabel = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
})

export function DailyOperatingDetail({ initialDate }: { initialDate: string }) {
  const { selectedStudio } = useApp()
  const [date, setDate] = useState(initialDate)
  const [data, setData] = useState<DailyOperatingDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ studioId: selectedStudio, date })
        const response = await fetch(`/api/operations/daily-detail?${params}`, {
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setData(result)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "Daily detail is unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [date, selectedStudio])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/operations" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Operations Performance
          </Link>
          <h1 className="text-2xl font-bold">Daily Operating Detail</h1>
          <p className="text-sm text-muted-foreground">Class-level attendance, capacity, lead time, and sales.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StudioSelect />
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-[150px]"
              aria-label="Operating date"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : error ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Classes", data.totals.classes.toLocaleString()],
              ["Seats sold", data.totals.seatsSold.toLocaleString()],
              ["Capacity", data.totals.capacity.toLocaleString()],
              ["Full", `${data.totals.percentFull.toFixed(1)}%`],
              [
                "Average lead time",
                data.totals.averageLeadTime === null
                  ? "—"
                  : `${data.totals.averageLeadTime.toFixed(1)} days`,
              ],
              ["F&B revenue", currency.format(data.totals.foodBeverageSales)],
              ["Revenue per seat", currency.format(data.totals.revenuePerSeat)],
              ["PTS class sales", currency.format(data.totals.ptsClassSales)],
              ["ClassPop sales", currency.format(data.totals.classpopSales)],
              ["Combined class sales", currency.format(data.totals.classSales)],
              ["Net sales", currency.format(data.totals.netSales)],
              [
                "COGS labor",
                `${currency.format(data.totals.cogsLaborCost)} · ${data.totals.cogsLaborPercent === null ? "—" : `${data.totals.cogsLaborPercent.toFixed(1)}%`}`,
              ],
              [
                "Overhead labor",
                `${currency.format(data.totals.overheadLaborCost)} · ${data.totals.overheadLaborPercent === null ? "—" : `${data.totals.overheadLaborPercent.toFixed(1)}%`}`,
              ],
              [
                "Total labor",
                `${currency.format(data.totals.totalLaborCost)} · ${data.totals.totalLaborPercent === null ? "—" : `${data.totals.totalLaborPercent.toFixed(1)}%`}`,
              ],
              ["Actual labor hours", data.totals.actualLaborHours.toFixed(1)],
            ].map(([label, value]) => (
              <Card key={label}><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>
            ))}
          </div>

          <div className="grid gap-6">
            {data.studios.map((studio) => (
              <Card key={studio.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{studio.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {dateLabel.format(new Date(`${data.date}T00:00:00Z`))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      <span><strong>{studio.totals.classes}</strong> classes</span>
                      <span><strong>{studio.totals.seatsSold}</strong> seats</span>
                      <span><strong>{studio.totals.percentFull.toFixed(1)}%</strong> full</span>
                      <span><strong>{currency.format(studio.totals.classpopSales)}</strong> ClassPop</span>
                      <span><strong>{currency.format(studio.totals.classSales)}</strong> combined class sales</span>
                      <span><strong>{currency.format(studio.totals.netSales)}</strong> net</span>
                      <span><strong>{currency.format(studio.totals.cogsLaborCost)}</strong> COGS labor</span>
                      <span><strong>{currency.format(studio.totals.overheadLaborCost)}</strong> OH labor</span>
                      <span><strong>{studio.totals.actualLaborHours.toFixed(1)}</strong> labor hours</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {studio.classes.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1450px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Time</th><th className="px-2 py-2 font-medium">Painting / class</th><th className="px-2 py-2 font-medium">Type</th><th className="px-2 py-2 font-medium">Room</th><th className="px-2 py-2 text-right font-medium">Seats</th><th className="px-2 py-2 text-right font-medium">Capacity</th><th className="px-2 py-2 text-right font-medium">Full</th><th className="px-2 py-2 text-right font-medium">Lead time</th><th className="px-2 py-2 text-right font-medium">PTS class sales</th><th className="px-2 py-2 text-right font-medium">ClassPop</th><th className="px-2 py-2 text-right font-medium">Combined class sales</th><th className="px-2 py-2 text-right font-medium">Products</th><th className="px-2 py-2 text-right font-medium">Fees</th><th className="px-2 py-2 text-right font-medium">Net sales</th>
                  </tr></thead>
                  <tbody>{studio.classes.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-2 py-3 font-medium">{row.classTime ? timeLabel.format(new Date(row.classTime)) : "—"}</td>
                      <td className="px-2 py-3 font-medium">{row.painting}</td>
                      <td className="px-2 py-3"><span>{row.reportingClassType}</span>{row.sourceClassType !== row.reportingClassType && <span className="block text-xs text-muted-foreground">PTS: {row.sourceClassType}</span>}</td>
                      <td className="px-2 py-3">{row.room}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{row.seatsSold.toLocaleString()}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{row.capacity.toLocaleString()}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{row.percentFull.toFixed(1)}%</td>
                      <td className="px-2 py-3 text-right tabular-nums">{row.leadTimeAverage === null ? "—" : `${row.leadTimeAverage.toFixed(1)} days`}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{currency.format(row.ptsClassSales)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{currency.format(row.classpopSales)}</td>
                      <td className="px-2 py-3 text-right font-medium tabular-nums">{currency.format(row.classSales)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{currency.format(row.productSales)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{currency.format(row.feeSales)}</td>
                      <td className="px-2 py-3 text-right font-medium tabular-nums">{currency.format(row.netSales)}</td>
                    </tr>
                  ))}</tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No reported classes for this studio on this date.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
