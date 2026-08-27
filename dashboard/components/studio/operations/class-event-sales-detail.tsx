"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ChevronDown, PartyPopper, Truck } from "lucide-react"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { formatAppliedDateRange } from "@/lib/date-range"
import { fetchWithRetry } from "@/lib/http/fetch-with-retry"
import type { ClassEventSalesDetailData } from "@/lib/services/operations"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})
const dateLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})
const timeLabel = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
})

export function ClassEventSalesDetail({
  kind,
}: {
  kind: "private-parties" | "mobile-events"
}) {
  const isPrivateParty = kind === "private-parties"
  const title = isPrivateParty ? "Private Party Detail" : "Mobile Events Detail"
  const singular = isPrivateParty ? "private party" : "mobile event"
  const endpoint = isPrivateParty ? "private-party-detail" : "mobile-events-detail"
  const DetailIcon = isPrivateParty ? PartyPopper : Truck
  const { selectedStudio, dateRange } = useApp()
  const [data, setData] = useState<ClassEventSalesDetailData | null>(null)
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
        })
        const response = await fetchWithRetry(`/api/operations/${endpoint}?${params}`, {
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setData(result)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(
          requestError instanceof Error
            ? requestError.message
            : `${title} is unavailable.`
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [dateRange.endDate, dateRange.startDate, endpoint, selectedStudio, title])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/operations" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Operations Performance
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <DetailIcon className="size-6 text-primary" /> {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            See every {singular} by studio in the selected completed-day range.
          </p>
        </div>
        <div className="text-right">
          <StudioSelect />
          <p className="mt-2 text-xs text-muted-foreground">{formatAppliedDateRange(dateRange)}</p>
        </div>
      </div>

      {loading ? <Skeleton className="h-80 rounded-xl" /> : error ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : data ? <>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent><p className="text-sm text-muted-foreground">Events</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.totals.events.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent><p className="text-sm text-muted-foreground">Seats sold</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.totals.seatsSold.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent><p className="text-sm text-muted-foreground">Revenue</p><p className="mt-2 text-2xl font-semibold tabular-nums">{currency.format(data.totals.revenue)}</p></CardContent></Card>
        </div>
        <div className="grid gap-6">
          {data.studios.map((studio) => (
            <details key={studio.id} className="group rounded-xl border bg-card text-card-foreground shadow-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-6">
                <CardTitle className="text-xl md:text-2xl">{studio.name}</CardTitle>
                <div className="flex items-center gap-3 text-xl tabular-nums md:text-2xl">
                  <span><strong>{studio.events.toLocaleString()}</strong> events · {studio.seatsSold.toLocaleString()} seats · {currency.format(studio.revenue)}</span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </div>
              </summary>
              <div className="border-t p-6 pt-4">
                {studio.classes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-2 py-2 font-medium">Date</th><th className="px-2 py-2 font-medium">Event</th><th className="px-2 py-2 font-medium">Time</th><th className="px-2 py-2 font-medium">Source type</th><th className="px-2 py-2 font-medium">Room</th><th className="px-2 py-2 text-right font-medium">Seats</th><th className="px-2 py-2 text-right font-medium">Capacity</th><th className="px-2 py-2 text-right font-medium">Revenue</th></tr></thead>
                  <tbody>{studio.classes.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-2 py-3">{dateLabel.format(new Date(`${item.date}T00:00:00Z`))}</td><td className="px-2 py-3 font-medium">{item.painting}</td><td className="px-2 py-3">{item.classTime ? timeLabel.format(new Date(item.classTime)) : "—"}</td><td className="px-2 py-3">{item.sourceClassType}</td><td className="px-2 py-3">{item.room}</td><td className="px-2 py-3 text-right tabular-nums">{item.seatsSold.toLocaleString()}</td><td className="px-2 py-3 text-right tabular-nums">{item.capacity.toLocaleString()}</td><td className="px-2 py-3 text-right font-medium tabular-nums">{currency.format(item.revenue)}</td></tr>)}</tbody>
                </table></div> : <p className="py-6 text-center text-sm text-muted-foreground">No {singular} events for this studio in the selected range.</p>}
              </div>
            </details>
          ))}
        </div>
      </> : null}
    </div>
  )
}
