"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  CircleDollarSign,
  MousePointerClick,
  Target,
  Users,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import type { MarketingDashboard as DashboardData } from "@/lib/services/marketing"
import { useApp } from "@/contexts/app-context"
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
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const metricCards = [
  { key: "paidSpend", label: "Marketing spend", icon: CircleDollarSign },
  { key: "sessions", label: "Website sessions", icon: Activity },
  { key: "newUsers", label: "New users", icon: Users },
  { key: "costPerSession", label: "Cost per session", icon: MousePointerClick },
  { key: "keyEvents", label: "GA4 key events", icon: Target },
  { key: "engagementRate", label: "Engagement rate", icon: Activity },
] as const

function formatMetric(
  key: (typeof metricCards)[number]["key"],
  value: number
) {
  if (key === "paidSpend") return currency.format(value)
  if (key === "costPerSession") return decimalCurrency.format(value)
  if (key === "engagementRate") return `${value.toFixed(1)}%`
  return value.toLocaleString()
}

export function MarketingDashboard() {
  const { selectedStudio, dateRange } = useApp()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - (days - 1))
        const params = new URLSearchParams({
          studioId: selectedStudio,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
        })
        const response = await fetch(`/api/marketing/summary?${params}`, {
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setData(result)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Marketing data is unavailable."
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [dateRange, selectedStudio])

  const spendPie = useMemo(
    () => data?.channels.filter((channel) => channel.spend > 0) ?? [],
    [data]
  )

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {metricCards.map(({ key }) => (
            <Skeleton key={key} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent>
          <p className="font-semibold text-destructive">
            We couldn&apos;t load marketing performance
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="gap-3 py-4">
            <CardHeader className="flex-row items-center justify-between px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-semibold tabular-nums">
                {formatMetric(key, data.kpis[key])}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Selected {data.period.days}-day period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Marketing spend over time</CardTitle>
            <p className="text-sm text-muted-foreground">
              Meta Ads and Eulerity remain separate paid platforms.
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px] w-full"
              config={{
                metaSpend: { label: "Meta Ads", color: "#2563eb" },
                euleritySpend: { label: "Eulerity", color: "#7c3aed" },
              }}
            >
              <AreaChart data={data.trends}>
                <defs>
                  <linearGradient id="meta-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eulerity-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${compactNumber.format(value)}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="metaSpend" type="monotone" stroke="#2563eb" fill="url(#meta-fill)" strokeWidth={2} />
                <Area dataKey="euleritySpend" type="monotone" stroke="#7c3aed" fill="url(#eulerity-fill)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by platform</CardTitle>
          </CardHeader>
          <CardContent>
            {spendPie.length ? (
              <ChartContainer
                className="mx-auto h-[210px] w-full"
                config={{
                  meta: { label: "Meta Ads", color: "#2563eb" },
                  eulerity: { label: "Eulerity", color: "#7c3aed" },
                }}
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={spendPie} dataKey="spend" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                    {spendPie.map((channel) => (
                      <Cell key={channel.key} fill={channel.key === "meta" ? "#2563eb" : "#7c3aed"} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[210px] items-center justify-center text-sm text-muted-foreground">
                No paid spend in this period
              </div>
            )}
            <div className="space-y-3">
              {data.channels.map((channel) => (
                <div key={channel.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${channel.key === "meta" ? "bg-blue-600" : "bg-violet-600"}`} />
                    {channel.name}
                  </span>
                  <span className="font-medium tabular-nums">{currency.format(channel.spend)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.channels.map((channel) => (
              <Link
                key={channel.key}
                href={`/marketing/${channel.key}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-5 rounded-lg px-3 py-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{channel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {channel.spend > 0 ? `${channel.share.toFixed(1)}% of known spend` : "No spend recorded"}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">{currency.format(channel.spend)}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
            <Link href="/marketing/ga4" className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-lg px-3 py-3 transition-colors hover:bg-muted">
              <div>
                <p className="font-medium">GA4 Analytics</p>
                <p className="text-xs text-muted-foreground">Traffic, engagement, and key events</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
            <Link href="/marketing/meta-organic" className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-lg px-3 py-3 transition-colors hover:bg-muted">
              <div>
                <p className="font-medium">Meta Organic</p>
                <p className="text-xs text-muted-foreground">
                  {data.organic.daysWithData
                    ? `${data.organic.daysWithData} days reported · ${data.organic.metricCount} metrics`
                    : "No Page Insights in this period"}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion path</CardTitle>
            <p className="text-sm text-muted-foreground">The stages currently supported by connected data.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Impressions", data.funnel.impressions],
              ["Paid clicks", data.funnel.clicks],
              ["Website sessions", data.funnel.sessions],
              ["GA4 key events", data.funnel.keyEvents],
            ].map(([label, value], index) => {
              const numericValue = Number(value)
              const max = Math.max(data.funnel.impressions, data.funnel.sessions, 1)
              return (
                <div key={String(label)}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium tabular-nums">{numericValue.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500" style={{ width: `${Math.max((numericValue / max) * 100, numericValue ? 2 : 0)}%`, opacity: 1 - index * 0.12 }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Spend combines Meta Ads and Eulerity without treating Eulerity social as Meta. Reservations, revenue attribution, and ROAS will appear after reservation/POS data is integrated.
      </p>
    </div>
  )
}
