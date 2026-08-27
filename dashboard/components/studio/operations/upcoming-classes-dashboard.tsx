"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, CalendarClock, ChevronDown } from "lucide-react"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { UpcomingClassesData } from "@/lib/services/upcoming-classes"
import { fetchWithRetry } from "@/lib/http/fetch-with-retry"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const bookedCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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
        const response = await fetchWithRetry(`/api/operations/upcoming-classes?${params}`, {
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
    { label: "Upcoming classes", value: data.kpis.upcomingClasses.toLocaleString() },
    { label: "Seats sold", value: data.kpis.seatsSold.toLocaleString() },
    { label: "Capacity", value: `${data.kpis.capacityPercent.toFixed(1)}%` },
    { label: "Current revenue", value: currency.format(data.kpis.currentRevenue) },
    {
      label: "Yesterday's booked seats",
      value: data.kpis.bookedSeats === null ? "Not available" : data.kpis.bookedSeats.toLocaleString(),
      note: data.kpis.bookedSeats === null ? "Reservations import has not loaded" : `${data.kpis.activeBookedSeats?.toLocaleString()} active · ${data.kpis.refundedSeats?.toLocaleString()} refunded · ${data.kpis.heldSeats?.toLocaleString()} held`,
    },
    {
      label: "Yesterday's booked sales",
      value: data.kpis.bookedSales === null ? "Not available" : bookedCurrency.format(data.kpis.bookedSales),
      note: data.kpis.bookedSales === null ? "Reservations import has not loaded" : "Gross booking-line sales from PTS Reservations",
    },
  ] : []

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <Link href="/operations" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Operations Performance</Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarClock className="size-6 text-primary" /> Upcoming Classes</h1>
        <p className="text-sm text-muted-foreground">Future capacity and revenue from Class Sales, with exact prior-day bookings from PTS Reservations.</p>
      </div>
      <div className="text-right"><StudioSelect />{data?.snapshotDate && <p className="mt-2 text-xs text-muted-foreground">Class snapshot {data.snapshotDate} · Bookings {data.bookingDate}</p>}</div>
    </div>

    {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div> : error ? (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
    ) : data ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.label}><CardContent><p className="text-sm text-muted-foreground">{card.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>{card.note && <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>}</CardContent></Card>)}</div>
      {!data.studios.length ? <Card><CardContent className="py-12 text-center"><p className="font-medium">No upcoming class snapshot is loaded</p><p className="mt-1 text-sm text-muted-foreground">Publish and run the future Class Sales snapshot workflow to populate this page.</p></CardContent></Card> : <div className="grid gap-6">{data.studios.map((studio) => {
        const studioSeats = studio.classes.reduce((sum, row) => sum + row.seatsSold, 0)
        const studioCapacity = studio.classes.reduce((sum, row) => sum + row.capacity, 0)
        const studioRevenue = studio.classes.reduce((sum, row) => sum + row.revenue, 0)
        return <details key={studio.id} className="group rounded-xl border bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-6"><span className="text-xl font-semibold md:text-2xl">{studio.name}</span><span className="flex flex-wrap items-center justify-end gap-3 text-lg tabular-nums"><strong>{studio.classes.length}</strong> classes · <strong>{studioSeats}</strong> seats · <strong>{studioCapacity ? ((studioSeats / studioCapacity) * 100).toFixed(1) : "0.0"}%</strong> · <strong>{currency.format(studioRevenue)}</strong> revenue<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span></summary>
          <div className="border-t p-6 pt-4"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-2 py-2 font-medium">Class</th><th className="px-2 py-2 font-medium">Type</th><th className="px-2 py-2 font-medium">Room</th><th className="px-2 py-2 text-right font-medium">Seats</th><th className="px-2 py-2 text-right font-medium">Remaining</th><th className="px-2 py-2 text-right font-medium">Capacity</th><th className="px-2 py-2 text-right font-medium">Revenue</th><th className="px-2 py-2 text-right font-medium">Net seat pickup</th><th className="px-2 py-2 text-right font-medium">Net revenue pickup</th></tr></thead><tbody>{studio.classes.map((row) => <tr key={row.eventKey} className="border-b last:border-0"><td className="px-2 py-3"><span className="font-medium">{row.painting}</span><span className="block text-xs text-muted-foreground">{row.classTime ? dateTimeLabel.format(new Date(row.classTime)) : row.eventDate}</span></td><td className="px-2 py-3">{row.classType}</td><td className="px-2 py-3">{row.room}</td><td className="px-2 py-3 text-right tabular-nums">{row.seatsSold}</td><td className="px-2 py-3 text-right tabular-nums">{row.seatsRemaining}</td><td className="px-2 py-3 text-right tabular-nums">{row.capacityPercent.toFixed(1)}%</td><td className="px-2 py-3 text-right tabular-nums">{currency.format(row.revenue)}</td><td className="px-2 py-3 text-right tabular-nums">{row.netSeatPickup ?? "—"}</td><td className="px-2 py-3 text-right tabular-nums">{row.netRevenuePickup === null ? "—" : currency.format(row.netRevenuePickup)}</td></tr>)}</tbody></table></div></div>
        </details>
      })}</div>}
    </> : null}
  </div>
}
