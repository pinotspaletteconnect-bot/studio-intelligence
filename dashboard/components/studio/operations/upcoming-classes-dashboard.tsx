"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, CalendarClock, ChevronDown } from "lucide-react"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { UpcomingClassesData } from "@/lib/services/upcoming-classes"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const dateTimeLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
})

export function UpcomingClassesDashboard() {
  const { selectedStudio } = useApp()
  const [data, setData] = useState<UpcomingClassesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ studioId: selectedStudio })
        const response = await fetch(`/api/operations/upcoming-classes?${params}`, {
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setData(result)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "Upcoming classes are unavailable.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [selectedStudio])

  const cards = data ? [
    ["Upcoming classes", data.kpis.upcomingClasses.toLocaleString()],
    ["Seats sold", data.kpis.seatsSold.toLocaleString()],
    ["Capacity", `${data.kpis.capacityPercent.toFixed(1)}%`],
    ["Current revenue", currency.format(data.kpis.currentRevenue)],
    ["Yesterday's seats sold", data.kpis.yesterdaySeats === null ? "Not available" : data.kpis.yesterdaySeats.toLocaleString()],
    ["Yesterday's sales", data.kpis.yesterdayRevenue === null ? "Not available" : currency.format(data.kpis.yesterdayRevenue)],
  ] : []

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <Link href="/operations" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Operations Performance</Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarClock className="size-6 text-primary" /> Upcoming Classes</h1>
        <p className="text-sm text-muted-foreground">Future capacity, revenue, and daily booking pickup from PTS Class Sales.</p>
      </div>
      <div className="text-right"><StudioSelect />{data?.snapshotDate && <p className="mt-2 text-xs text-muted-foreground">Snapshot {data.snapshotDate}</p>}</div>
    </div>

    {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div> : error ? (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
    ) : data ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <Card key={label}><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
      {!data.studios.length ? <Card><CardContent className="py-12 text-center"><p className="font-medium">No upcoming class snapshot is loaded</p><p className="mt-1 text-sm text-muted-foreground">Publish and run the future Class Sales snapshot workflow to populate this page.</p></CardContent></Card> : <div className="grid gap-6">{data.studios.map((studio) => {
        const studioSeats = studio.classes.reduce((sum, row) => sum + row.seatsSold, 0)
        const studioCapacity = studio.classes.reduce((sum, row) => sum + row.capacity, 0)
        const studioRevenue = studio.classes.reduce((sum, row) => sum + row.revenue, 0)
        return <details key={studio.id} className="group rounded-xl border bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-6"><span className="text-xl font-semibold md:text-2xl">{studio.name}</span><span className="flex flex-wrap items-center justify-end gap-3 text-lg tabular-nums"><strong>{studio.classes.length}</strong> classes · <strong>{studioSeats}</strong> seats · <strong>{studioCapacity ? ((studioSeats / studioCapacity) * 100).toFixed(1) : "0.0"}%</strong> · <strong>{currency.format(studioRevenue)}</strong> revenue<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span></summary>
          <div className="border-t p-6 pt-4"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-2 py-2 font-medium">Class</th><th className="px-2 py-2 font-medium">Type</th><th className="px-2 py-2 font-medium">Room</th><th className="px-2 py-2 text-right font-medium">Seats</th><th className="px-2 py-2 text-right font-medium">Remaining</th><th className="px-2 py-2 text-right font-medium">Capacity</th><th className="px-2 py-2 text-right font-medium">Revenue</th><th className="px-2 py-2 text-right font-medium">Yesterday seats</th><th className="px-2 py-2 text-right font-medium">Yesterday revenue</th></tr></thead><tbody>{studio.classes.map((row) => <tr key={row.eventKey} className="border-b last:border-0"><td className="px-2 py-3"><span className="font-medium">{row.painting}</span><span className="block text-xs text-muted-foreground">{row.classTime ? dateTimeLabel.format(new Date(row.classTime)) : row.eventDate}</span></td><td className="px-2 py-3">{row.classType}</td><td className="px-2 py-3">{row.room}</td><td className="px-2 py-3 text-right tabular-nums">{row.seatsSold}</td><td className="px-2 py-3 text-right tabular-nums">{row.seatsRemaining}</td><td className="px-2 py-3 text-right tabular-nums">{row.capacityPercent.toFixed(1)}%</td><td className="px-2 py-3 text-right tabular-nums">{currency.format(row.revenue)}</td><td className="px-2 py-3 text-right tabular-nums">{row.yesterdaySeats ?? "—"}</td><td className="px-2 py-3 text-right tabular-nums">{row.yesterdayRevenue === null ? "—" : currency.format(row.yesterdayRevenue)}</td></tr>)}</tbody></table></div></div>
        </details>
      })}</div>}
    </> : null}
  </div>
}
