"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ChevronDown, PartyPopper } from "lucide-react"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { WeeklyPartiesData } from "@/lib/services/weekly-parties"
import { fetchWithRetry } from "@/lib/http/fetch-with-retry"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
const dateOnly = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })

export function WeeklyPartiesDashboard() {
  const { selectedStudio } = useApp()
  const [data, setData] = useState<WeeklyPartiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchWithRetry(`/api/operations/weekly-parties?${new URLSearchParams({ studioId: selectedStudio })}`, { signal: controller.signal })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result })
      .then(setData)
      .catch((requestError) => { if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(requestError instanceof Error ? requestError.message : "Weekly party details are unavailable.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [selectedStudio])

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div><Link href="/executive" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Executive Dashboard</Link><h1 className="flex items-center gap-2 text-2xl font-bold"><PartyPopper className="size-6 text-primary" /> Parties Scheduled This Week</h1><p className="text-sm text-muted-foreground">Confirmed parties have capacity above zero. Zero-capacity inquiries remain visible as leads.</p></div>
      <StudioSelect />
    </div>
    {loading ? <Skeleton className="h-80 rounded-xl" /> : error ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{error}</CardContent></Card> : data ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[['Confirmed parties', data.totals.events], ['Leads', data.totals.leads], ['Private parties', data.totals.privateParties], ['Mobile events', data.totals.mobileEvents], ['Seats', data.totals.seatsSold], ['Revenue', money.format(data.totals.revenue)]].map(([label, value]) => <Card key={label}><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}
      </div>
      <p className="text-sm text-muted-foreground">{dateOnly.format(new Date(`${data.period.startDate}T00:00:00Z`))}–{dateOnly.format(new Date(`${data.period.endDate}T00:00:00Z`))}{data.snapshotDate ? ` · upcoming snapshot ${dateOnly.format(new Date(`${data.snapshotDate}T00:00:00Z`))}` : ""}</p>
      {!data.studios.length ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No parties or party leads are recorded this week.</CardContent></Card> : data.studios.map((studio) => { const confirmed = studio.events.filter((event) => event.capacity > 0).length; const leads = studio.events.length - confirmed; return <details key={studio.id} open className="group rounded-xl border bg-card shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6"><span className="text-xl font-semibold">{studio.name}</span><span className="flex items-center gap-2"><strong>{confirmed}</strong> parties{leads ? ` · ${leads} ${leads === 1 ? "lead" : "leads"}` : ""} <ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span></summary><div className="overflow-x-auto border-t p-6 pt-4"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-2 py-2">Date and time</th><th className="px-2 py-2">Title</th><th className="px-2 py-2">Event</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Room</th><th className="px-2 py-2 text-right">Seats</th><th className="px-2 py-2 text-right">Capacity</th><th className="px-2 py-2 text-right">Revenue</th></tr></thead><tbody>{studio.events.map((event) => <tr key={event.id} className={`border-b last:border-0 ${event.status === "Lead" ? "bg-amber-500/5" : ""}`}><td className="px-2 py-3">{event.classTime ? dateTime.format(new Date(event.classTime)) : dateOnly.format(new Date(`${event.date}T00:00:00Z`))}</td><td className="px-2 py-3 font-medium">{event.displayName ?? "—"}</td><td className="px-2 py-3">{event.name}</td><td className="px-2 py-3">{event.type}</td><td className={`px-2 py-3 font-medium ${event.status === "Lead" ? "text-amber-700 dark:text-amber-300" : ""}`}>{event.status}</td><td className="px-2 py-3">{event.room}</td><td className="px-2 py-3 text-right">{event.seatsSold}</td><td className="px-2 py-3 text-right">{event.capacity}</td><td className="px-2 py-3 text-right font-medium">{money.format(event.revenue)}</td></tr>)}</tbody></table></div></details> })}
    </> : null}
  </div>
}
