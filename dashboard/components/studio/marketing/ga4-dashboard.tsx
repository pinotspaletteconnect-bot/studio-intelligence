"use client"

import { useEffect, useState } from "react"
import { Activity, Clock3, DollarSign, Globe2, MousePointerClick, ShoppingCart, Sparkles, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import type { Ga4Breakdown, Ga4Kpi, Ga4NorthAmericaDashboard } from "@/lib/services/ga4-reporting"

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

function duration(value: number) {
  const minutes = Math.floor(value / 60)
  const seconds = Math.round(value % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function KpiCard({ label, kpi, format = "number", icon: Icon }: { label: string; kpi: Ga4Kpi; format?: "number" | "percent" | "currency" | "duration" | "decimal"; icon: typeof Users }) {
  const formatted = format === "percent" ? `${kpi.value.toFixed(1)}%` : format === "currency" ? currency.format(kpi.value) : format === "duration" ? duration(kpi.value) : format === "decimal" ? kpi.value.toFixed(2) : compact.format(kpi.value)
  const positive = (kpi.change ?? 0) >= 0
  return <Card className="gap-3 py-4">
    <CardContent className="px-4">
      <div className="flex items-start justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className="size-4 text-muted-foreground" /></div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{formatted}</p>
      <p className={`mt-1 text-xs font-medium ${kpi.change === null ? "text-muted-foreground" : positive ? "text-emerald-700" : "text-red-700"}`}>{kpi.change === null ? "No prior-period baseline" : `${positive ? "+" : ""}${kpi.change.toFixed(1)}% vs previous period`}</p>
    </CardContent>
  </Card>
}

function BreakdownChart({ title, description, data, color = "#2563eb" }: { title: string; description: string; data: Ga4Breakdown[]; color?: string }) {
  const chartData = data.slice(0, 6).map(item => ({ name: item.name.length > 18 ? `${item.name.slice(0, 17)}…` : item.name, sessions: item.sessions }))
  return <Card>
    <CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent>
      {chartData.length ? <ResponsiveContainer width="100%" height={230}><BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={value => compact.format(Number(value))} tickLine={false} axisLine={false} fontSize={11} /><YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} fontSize={11} /><Tooltip formatter={value => [number.format(Number(value)), "Sessions"]} /><Bar dataKey="sessions" fill={color} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-muted-foreground">No breakdown data for this period.</p>}
    </CardContent>
  </Card>
}

function DataTable({ title, description, headers, rows }: { title: string; description: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return <Card>
    <CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-xs text-muted-foreground">{headers.map((header, index) => <th key={header} className={`px-2 py-2 font-medium ${index ? "text-right" : "text-left"}`}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="border-b last:border-0">{row.map((cell, index) => <td key={index} className={`px-2 py-2.5 ${index ? "text-right tabular-nums" : "font-medium"}`}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="py-10 text-center text-muted-foreground">No data for this period.</td></tr>}</tbody></table></div></CardContent>
  </Card>
}

export function Ga4Dashboard() {
  const { selectedStudio, dateRange } = useApp()
  const [data, setData] = useState<Ga4NorthAmericaDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(null)
      try {
        const params = new URLSearchParams({ studioId: selectedStudio, startDate: dateRange.startDate, endDate: dateRange.endDate })
        const response = await fetch(`/api/marketing/ga4?${params}`, { signal: controller.signal })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "GA4 reporting is unavailable.")
        setData(result)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "GA4 reporting is unavailable.")
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [dateRange.endDate, dateRange.startDate, selectedStudio])

  return <div className="flex flex-col gap-6 p-4 md:p-6">
    <DashboardToolbar title="GA4 North America" subtitle="Website audience, acquisition, behavior, and ecommerce—restricted to North American traffic." />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
      <div className="flex items-center gap-2"><Globe2 className="size-4" /><span><strong>Geographic scope:</strong> North America only</span></div>
      <Badge variant="outline" className="border-blue-300 bg-white text-blue-800">Enforced during GA4 collection</Badge>
    </div>
    {loading && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div><Skeleton className="h-80 rounded-xl" /></div>}
    {error && <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">{error}</CardContent></Card>}
    {!loading && !error && data && !data.hasData && <Card><CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 text-center"><span className="rounded-full bg-blue-50 p-4 text-blue-700"><Globe2 className="size-7" /></span><div><h2 className="text-lg font-semibold">North America GA4 data is awaiting its first load</h2><p className="mt-1 max-w-xl text-sm text-muted-foreground">The dedicated reporting model is {data.configured ? "ready" : "not deployed yet"}. This page will not substitute global GA4 totals because doing so would violate the selected geographic scope.</p></div></CardContent></Card>}
    {!loading && !error && data?.hasData && <>
      <section><div className="mb-3"><h2 className="text-lg font-semibold">Performance snapshot</h2><p className="text-sm text-muted-foreground">Current period compared with the immediately preceding period.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Avg. daily active users" kpi={data.kpis.activeUsers} icon={Users} /><KpiCard label="Sessions" kpi={data.kpis.sessions} icon={Activity} /><KpiCard label="New users" kpi={data.kpis.newUsers} icon={Sparkles} /><KpiCard label="Engagement rate" kpi={data.kpis.engagementRate} format="percent" icon={MousePointerClick} /><KpiCard label="Views per daily user" kpi={data.kpis.pageViewsPerUser} format="decimal" icon={Activity} />
        <KpiCard label="Avg. engagement time" kpi={data.kpis.averageEngagementTime} format="duration" icon={Clock3} /><KpiCard label="Key events" kpi={data.kpis.keyEvents} icon={MousePointerClick} /><KpiCard label="Purchases" kpi={data.kpis.purchases} icon={ShoppingCart} /><KpiCard label="Purchase revenue" kpi={data.kpis.purchaseRevenue} format="currency" icon={DollarSign} /><KpiCard label="Purchase conversion" kpi={data.kpis.conversionRate} format="percent" icon={ShoppingCart} />
      </div></section>
      <Card><CardHeader><CardTitle>Audience trend</CardTitle><CardDescription>Daily active users and sessions within North America.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={320}><LineChart data={data.trends} margin={{ left: 0, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickFormatter={value => dateLabel.format(new Date(`${value}T00:00:00Z`))} tickLine={false} axisLine={false} fontSize={11} /><YAxis tickFormatter={value => compact.format(Number(value))} tickLine={false} axisLine={false} fontSize={11} width={42} /><Tooltip labelFormatter={value => dateLabel.format(new Date(`${value}T00:00:00Z`))} formatter={(value, name) => [number.format(Number(value)), name === "activeUsers" ? "Active users" : "Sessions"]} /><Line type="monotone" dataKey="sessions" stroke="#2563eb" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="activeUsers" stroke="#14b8a6" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></CardContent></Card>
      <section><div className="mb-3"><h2 className="text-lg font-semibold">Audience</h2><p className="text-sm text-muted-foreground">Where visitors are located and how they access the site.</p></div><div className="grid gap-4 xl:grid-cols-3"><BreakdownChart title="Countries" description="Sessions by North American country." data={data.countries} /><BreakdownChart title="Devices" description="Mobile, desktop, tablet, and other devices." data={data.devices} color="#14b8a6" /><BreakdownChart title="Operating systems" description="Leading visitor operating systems." data={data.operatingSystems} color="#7c3aed" /></div></section>
      <DataTable title="Top cities" description="Highest-session cities in the selected period." headers={["City", "Sessions", "New users", "Key events", "Revenue"]} rows={data.cities.map(row => [row.name, number.format(row.sessions), number.format(row.newUsers), number.format(row.keyEvents), currency.format(row.revenue)])} />
      <DataTable title="Traffic acquisition" description="GA4 session source and medium, filtered to North America." headers={["Source", "Medium", "Sessions", "New users", "Key events", "Revenue"]} rows={data.sources.map(row => [row.name, row.secondary || "—", number.format(row.sessions), number.format(row.newUsers), number.format(row.keyEvents), currency.format(row.revenue)])} />
      <div className="grid gap-4 xl:grid-cols-2"><DataTable title="Top pages" description="Content attracting the most views." headers={["Page path", "Views", "Key events", "Revenue"]} rows={data.pages.map(row => [row.name, number.format(row.views), number.format(row.keyEvents), currency.format(row.revenue)])} /><DataTable title="Top events" description="Most frequently triggered GA4 events." headers={["Event", "Count", "Revenue"]} rows={data.events.map(row => [row.name, number.format(row.count), currency.format(row.revenue)])} /></div>
    </>}
  </div>
}
