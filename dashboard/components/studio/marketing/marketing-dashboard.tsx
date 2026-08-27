"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CircleDollarSign,
  Gauge,
  MousePointerClick,
  Plus,
  Target,
  Trash2,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import type { MarketingDashboard } from "@/lib/services/marketing"
import type {
  MarketingStrategyChange,
  StrategyChangeType,
} from "@/lib/services/marketing-strategy-changes"
import { useApp } from "@/contexts/app-context"
import { fetchWithRetry } from "@/lib/http/fetch-with-retry"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { KpiHelp } from "@/components/studio/shared/kpi-help"

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

const studioChartColors = [
  "#2563eb",
  "#7c3aed",
  "#f97316",
  "#059669",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
]

type DashboardData = MarketingDashboard & {
  strategyChanges: MarketingStrategyChange[]
  canManageStrategyChanges: boolean
}

const strategyChangeLabels: Record<StrategyChangeType, string> = {
  budget: "Budget",
  targeting: "Targeting / ZIP codes",
  creative: "Creative",
  bidding: "Bidding",
  campaign_structure: "Campaign structure",
  offer: "Offer",
  other: "Other",
}

function formatChartDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

function previousDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

const metricCards = [
  { key: "paidSpend", label: "Meta + Eulerity spend", description: "Total advertising spend reported by Meta and Eulerity during the selected period.", icon: CircleDollarSign },
  { key: "attributedRevenue", label: "Attributed revenue", description: "GA4 purchase revenue credited to paid marketing traffic from the supported platforms.", icon: CircleDollarSign },
  { key: "attributedRoas", label: "Attributed ROAS", description: "Attributed revenue divided by paid advertising spend. For example, 3.00x means $3 in attributed revenue per $1 spent.", icon: Gauge },
  { key: "paidCpc", label: "Paid CPC", description: "Average paid cost per click: advertising spend divided by reported paid clicks.", icon: MousePointerClick },
  { key: "sessions", label: "Website sessions", description: "Visits to the website reported by GA4; one visitor can create more than one session.", icon: Activity },
  { key: "keyEvents", label: "GA4 key events", description: "Important website actions marked as key events in GA4, such as leads or purchases.", icon: Target },
] as const

function formatMetric(
  key: (typeof metricCards)[number]["key"],
  value: number
) {
  if (key === "paidSpend" || key === "attributedRevenue") {
    return currency.format(value)
  }
  if (key === "paidCpc") return decimalCurrency.format(value)
  if (key === "attributedRoas") return `${value.toFixed(2)}x`
  return value.toLocaleString()
}

const needsAttribution = (key: (typeof metricCards)[number]["key"]) =>
  key === "attributedRevenue" || key === "attributedRoas"

type SourceSortKey =
  | "name"
  | "reportingGroup"
  | "sessions"
  | "newUsers"
  | "keyEvents"
  | "revenue"

export function MarketingDashboard() {
  const { selectedStudio, dateRange, studios } = useApp()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [strategyFormOpen, setStrategyFormOpen] = useState(false)
  const [strategyStudioId, setStrategyStudioId] = useState("all")
  const [strategyDate, setStrategyDate] = useState(dateRange.endDate)
  const [strategyType, setStrategyType] =
    useState<StrategyChangeType>("budget")
  const [strategyTitle, setStrategyTitle] = useState("")
  const [strategyNotes, setStrategyNotes] = useState("")
  const [strategySaving, setStrategySaving] = useState(false)
  const [strategyError, setStrategyError] = useState<string | null>(null)
  const [sourceSort, setSourceSort] = useState<{
    key: SourceSortKey
    direction: "asc" | "desc"
  }>({ key: "sessions", direction: "desc" })

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
        const response = await fetchWithRetry(`/api/marketing/summary?${params}`, {
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
  }, [dateRange.endDate, dateRange.startDate, selectedStudio])

  const spendPie = useMemo(
    () => data?.channels.filter((channel) => channel.spend > 0) ?? [],
    [data]
  )
  const sortedSourceMedium = useMemo(() => {
    const rows = [...(data?.sourceMedium ?? [])]
    const direction = sourceSort.direction === "asc" ? 1 : -1

    return rows.sort((a, b) => {
      const aValue = a[sourceSort.key]
      const bValue = b[sourceSort.key]
      const comparison =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue))

      return comparison * direction || b.sessions - a.sessions
    })
  }, [data, sourceSort])
  const metaCampaignTotals = useMemo(() => {
    const totals = (data?.metaCampaigns ?? []).reduce(
      (sum, campaign) => ({
        spend: sum.spend + campaign.spend,
        impressions: sum.impressions + campaign.impressions,
        reach: sum.reach + campaign.reach,
        clicks: sum.clicks + campaign.clicks,
      }),
      { spend: 0, impressions: 0, reach: 0, clicks: 0 }
    )

    return {
      ...totals,
      ctr: totals.impressions
        ? (totals.clicks / totals.impressions) * 100
        : 0,
      cpc: totals.clicks ? totals.spend / totals.clicks : 0,
      cpm: totals.impressions
        ? (totals.spend / totals.impressions) * 1000
        : 0,
    }
  }, [data])
  const eulerityChannelTotals = useMemo(() => {
    const totals = (data?.eulerityChannels ?? []).reduce(
      (sum, channel) => ({
        spend: sum.spend + channel.spend,
        impressions: sum.impressions + channel.impressions,
        clicks: sum.clicks + channel.clicks,
      }),
      { spend: 0, impressions: 0, clicks: 0 }
    )

    return {
      ...totals,
      ctr: totals.impressions
        ? (totals.clicks / totals.impressions) * 100
        : 0,
      cpc: totals.clicks ? totals.spend / totals.clicks : 0,
    }
  }, [data])
  const strategyChangesByDate = useMemo(() => {
    const grouped = new Map<string, MarketingStrategyChange[]>()
    for (const change of data?.strategyChanges ?? []) {
      const changes = grouped.get(change.effectiveDate) ?? []
      changes.push(change)
      grouped.set(change.effectiveDate, changes)
    }
    return [...grouped.entries()].map(([date, changes]) => ({ date, changes }))
  }, [data])
  const strategyRoasComparisons = useMemo(() => {
    const comparisons = new Map<
      number,
      {
        beforeRoas: number | null
        afterRoas: number | null
        beforeStart: string
        beforeEnd: string
        afterStart: string
        afterEnd: string
      }
    >()

    for (const change of data?.strategyChanges ?? []) {
      const applicableStudios = (data?.eulerityDailyRoas.studios ?? []).filter(
        (studio) => change.studioId == null || studio.id === change.studioId
      )
      let beforeSpend = 0
      let beforeRevenue = 0
      let afterSpend = 0
      let afterRevenue = 0

      for (const point of data?.eulerityDailyRoas.points ?? []) {
        const date = String(point.date)
        for (const studio of applicableStudios) {
          if (point[studio.dataKey] == null) continue
          const spend = Number(point[studio.spendKey] ?? 0)
          const revenue = Number(point[studio.revenueKey] ?? 0)
          if (date < change.effectiveDate) {
            beforeSpend += spend
            beforeRevenue += revenue
          } else {
            afterSpend += spend
            afterRevenue += revenue
          }
        }
      }

      comparisons.set(change.id, {
        beforeRoas: beforeSpend > 0 ? beforeRevenue / beforeSpend : null,
        afterRoas: afterSpend > 0 ? afterRevenue / afterSpend : null,
        beforeStart: dateRange.startDate,
        beforeEnd: previousDate(change.effectiveDate),
        afterStart: change.effectiveDate,
        afterEnd: dateRange.endDate,
      })
    }

    return comparisons
  }, [data, dateRange.endDate, dateRange.startDate])

  const openStrategyForm = () => {
    setStrategyStudioId(selectedStudio === "all" ? "all" : selectedStudio)
    setStrategyDate(dateRange.endDate)
    setStrategyError(null)
    setStrategyFormOpen(true)
  }

  const saveStrategyChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStrategySaving(true)
    setStrategyError(null)
    try {
      const response = await fetch("/api/marketing/strategy-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId:
            strategyStudioId === "all" ? null : Number(strategyStudioId),
          effectiveDate: strategyDate,
          changeType: strategyType,
          title: strategyTitle,
          notes: strategyNotes,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setData((current) =>
        current
          ? {
              ...current,
              strategyChanges: [...current.strategyChanges, result].sort(
                (a, b) =>
                  a.effectiveDate.localeCompare(b.effectiveDate) || a.id - b.id
              ),
            }
          : current
      )
      setStrategyTitle("")
      setStrategyNotes("")
      setStrategyFormOpen(false)
    } catch (saveError) {
      setStrategyError(
        saveError instanceof Error
          ? saveError.message
          : "The strategy change could not be saved."
      )
    } finally {
      setStrategySaving(false)
    }
  }

  const removeStrategyChange = async (id: number) => {
    setStrategyError(null)
    const response = await fetch("/api/marketing/strategy-changes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const result = await response.json()
    if (!response.ok) {
      setStrategyError(result.error ?? "The strategy change could not be removed.")
      return
    }
    setData((current) =>
      current
        ? {
            ...current,
            strategyChanges: current.strategyChanges.filter(
              (change) => change.id !== id
            ),
          }
        : current
    )
  }

  const changeSourceSort = (key: SourceSortKey) => {
    setSourceSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "desc"
            ? "asc"
            : "desc"
          : key === "name" || key === "reportingGroup"
            ? "asc"
            : "desc",
    }))
  }

  const sourceSortIcon = (key: SourceSortKey) => {
    if (sourceSort.key !== key) return <ArrowUpDown className="size-3.5" />
    return sourceSort.direction === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    )
  }

  const sortableHeading = (
    label: string,
    key: SourceSortKey,
    align: "left" | "right" = "left"
  ) => (
    <button
      type="button"
      onClick={() => changeSourceSort(key)}
      className={`inline-flex w-full items-center gap-1.5 hover:text-foreground ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {label}
      {sourceSortIcon(key)}
    </button>
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

  const paidCpcBenchmark = data.kpis.paidCpcBenchmark
  const paidCpcDifference =
    paidCpcBenchmark.available &&
    paidCpcBenchmark.median != null &&
    paidCpcBenchmark.median > 0 &&
    data.kpis.paidCpc > 0
      ? ((paidCpcBenchmark.median - data.kpis.paidCpc) /
          paidCpcBenchmark.median) *
        100
      : null

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map(({ key, label, description, icon: Icon }) => (
          <Card key={key} className="gap-3 py-4">
            <CardHeader className="flex-row items-center justify-between px-4">
              <div className="flex items-center gap-1.5"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle><KpiHelp description={description} /></div>
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-semibold tabular-nums">
                {needsAttribution(key) && !data.kpis.attributionAvailable
                  ? "—"
                  : formatMetric(key, data.kpis[key])}
              </p>
              <p
                className={`mt-1 text-xs ${
                  key === "paidCpc" && paidCpcDifference != null
                    ? paidCpcDifference >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {needsAttribution(key) && !data.kpis.attributionAvailable
                  ? "Awaiting GA4 source/medium import"
                  : key === "paidCpc"
                    ? paidCpcDifference != null &&
                      paidCpcBenchmark.median != null
                      ? `${Math.abs(paidCpcDifference).toFixed(1)}% ${
                          paidCpcDifference >= 0 ? "better" : "higher"
                        } than participant median (${decimalCurrency.format(
                          paidCpcBenchmark.median
                        )}, ${paidCpcBenchmark.cohortStudios} studios)`
                      : paidCpcBenchmark.participating
                        ? "Collective benchmark unlocks at 10 studios across 3 organizations"
                        : "Industry reference: $0.50–$1.60"
                  : `Selected ${data.period.days}-day period`}
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
              Meta Ads, Eulerity, and connected MNTN accounts remain separate
              paid platforms.
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px] w-full"
              config={{
                metaSpend: { label: "Meta Ads", color: "#2563eb" },
                euleritySpend: { label: "Eulerity", color: "#7c3aed" },
                mntnSpend: { label: "MNTN", color: "#f97316" },
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
                  <linearGradient id="mntn-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${compactNumber.format(value)}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="metaSpend" type="monotone" stroke="#2563eb" fill="url(#meta-fill)" strokeWidth={2} />
                <Area dataKey="euleritySpend" type="monotone" stroke="#7c3aed" fill="url(#eulerity-fill)" strokeWidth={2} />
                {data.mntn.advertisers.length ? (
                  <Area dataKey="mntnSpend" type="monotone" stroke="#f97316" fill="url(#mntn-fill)" strokeWidth={2} />
                ) : null}
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
                  mntn: { label: "MNTN", color: "#f97316" },
                }}
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={spendPie} dataKey="spend" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                    {spendPie.map((channel) => (
                      <Cell
                        key={channel.key}
                        fill={
                          channel.key === "meta"
                            ? "#2563eb"
                            : channel.key === "eulerity"
                              ? "#7c3aed"
                              : "#f97316"
                        }
                      />
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
                    <span
                      className={`size-2.5 rounded-full ${
                        channel.key === "meta"
                          ? "bg-blue-600"
                          : channel.key === "eulerity"
                            ? "bg-violet-600"
                            : "bg-orange-500"
                      }`}
                    />
                    {channel.name}
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-medium">
                      {currency.format(channel.spend)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {channel.share.toFixed(1)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GA4 source / medium performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue and conversions follow GA4 session attribution. Paid spend and
            clicks remain sourced from Meta and Eulerity.
          </p>
        </CardHeader>
        <CardContent>
          {data.sourceMedium.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">
                      {sortableHeading("Marketing source", "name")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {sortableHeading("Classification", "reportingGroup")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {sortableHeading("Sessions", "sessions", "right")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {sortableHeading("New users", "newUsers", "right")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {sortableHeading("Key events", "keyEvents", "right")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {sortableHeading("Revenue", "revenue", "right")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSourceMedium.map((row) => (
                    <tr
                      key={`${row.name}|${row.reportingGroup}|${row.vendor}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.reportingGroup}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p>{row.vendor}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.trafficCategory} · {row.marketingType}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {row.sessions.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {row.newUsers.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {row.keyEvents.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {currency.format(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center">
              <p className="font-medium">Source/medium attribution is not loaded yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This table will populate after the GA4 source/medium migration and
                import are activated.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Meta campaign performance</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the spending account and compare campaign delivery.
              Revenue and ROAS are not estimated.
            </p>
          </div>
          <Link
            href="/marketing/meta"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all campaigns
            <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {data.metaCampaigns.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Ad account</th>
                    <th className="px-3 py-2 font-medium">Campaign</th>
                    <th className="px-3 py-2 text-right font-medium">Spend</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Impressions
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Reported reach
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Clicks</th>
                    <th className="px-3 py-2 text-right font-medium">CTR</th>
                    <th className="px-3 py-2 text-right font-medium">CPC</th>
                    <th className="px-3 py-2 text-right font-medium">CPM</th>
                  </tr>
                </thead>
                <tbody>
                  {data.metaCampaigns.map((campaign) => (
                    <tr
                      key={`${campaign.accountId}|${campaign.campaignId}`}
                      className="border-b last:border-0"
                    >
                      <td className="max-w-56 px-3 py-3">
                        <p className="truncate font-medium">
                          {campaign.accountName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {campaign.accountId}
                        </p>
                      </td>
                      <td className="max-w-72 px-3 py-3">
                        <p className="truncate font-medium">
                          {campaign.campaignName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {campaign.campaignId}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {currency.format(campaign.spend)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {campaign.impressions.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {campaign.reach.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {campaign.clicks.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {campaign.ctr.toFixed(2)}%
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {decimalCurrency.format(campaign.cpc)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {decimalCurrency.format(campaign.cpm)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/40 font-semibold">
                    <td className="px-3 py-3" colSpan={2}>
                      All campaigns total
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {currency.format(metaCampaignTotals.spend)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {metaCampaignTotals.impressions.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {metaCampaignTotals.reach.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {metaCampaignTotals.clicks.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {metaCampaignTotals.ctr.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {decimalCurrency.format(metaCampaignTotals.cpc)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {decimalCurrency.format(metaCampaignTotals.cpm)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center">
              <p className="font-medium">No Meta campaign delivery in this period</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select another studio or date range to review campaign activity.
              </p>
            </div>
          )}
          {data.metaCampaigns.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Reported reach is the sum of stored daily ad-level reach and is not
              deduplicated across ads or days.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Eulerity channel performance</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Allocated Eulerity spend and delivery across Social, Search,
              Display, Video, and Other.
            </p>
          </div>
          <Link
            href="/marketing/eulerity"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View Eulerity
            <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 text-right font-medium">Spend</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Spend share
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Impressions
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Clicks</th>
                  <th className="px-3 py-2 text-right font-medium">CTR</th>
                  <th className="px-3 py-2 text-right font-medium">CPC</th>
                </tr>
              </thead>
              <tbody>
                {data.eulerityChannels.map((channel) => (
                  <tr key={channel.key} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium">{channel.name}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {currency.format(channel.spend)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {channel.spendShare.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {channel.impressions.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {channel.clicks.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {channel.ctr.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {decimalCurrency.format(channel.cpc)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/40 font-semibold">
                  <td className="px-3 py-3">Eulerity total</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {currency.format(eulerityChannelTotals.spend)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {eulerityChannelTotals.spend ? "100.0%" : "0.0%"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {eulerityChannelTotals.impressions.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {eulerityChannelTotals.clicks.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {eulerityChannelTotals.ctr.toFixed(2)}%
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {decimalCurrency.format(eulerityChannelTotals.cpc)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Channel spend is allocated from Eulerity total spend using the
            reported channel percentages. CTR and CPC are recalculated from the
            selected-period totals.
          </p>
        </CardContent>
      </Card>

      {data.mntn.advertisers.length ? (
        <Card id="mntn-performance">
          <CardHeader>
            <CardTitle>MNTN Connected TV performance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Delivery and MNTN-reported view-through attribution for the selected
              period. Attribution can mature for 30 days after an ad exposure.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Spend", currency.format(data.mntn.spend)],
                  ["Impressions", data.mntn.impressions.toLocaleString()],
                  [
                    "Households reached",
                    data.mntn.householdsReached.toLocaleString(),
                  ],
                  [
                    "Commercials aired",
                    data.mntn.commercialsAired.toLocaleString(),
                  ],
                  [
                    "Verified visits",
                    data.mntn.verifiedVisits.toLocaleString(),
                  ],
                  ["Conversions", data.mntn.conversions.toLocaleString()],
                  [
                    "Attributed order value",
                    currency.format(data.mntn.orderValue),
                  ],
                  ["Modeled ROAS", `${data.mntn.roas.toFixed(2)}x`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Modeled ROAS by studio</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.mntn.studios.map((studio) => (
                    <div
                      key={studio.id}
                      className="rounded-lg border bg-muted/20 p-4"
                    >
                      <p className="text-xs text-muted-foreground">
                        {studio.name}
                      </p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">
                        {studio.roas.toFixed(2)}x
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {currency.format(studio.orderValue)} attributed /{" "}
                        {currency.format(studio.spend)} spend
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Measurement</th>
                      <th className="px-3 py-2 text-right font-medium">Visits</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Conversions
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Order value
                      </th>
                      <th className="px-3 py-2 text-right font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-3">
                        <p className="font-medium">MNTN modeled attribution</p>
                        <p className="text-xs text-muted-foreground">
                          Includes verified view-through activity
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {data.mntn.verifiedVisits.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {data.mntn.conversions.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {currency.format(data.mntn.orderValue)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {data.mntn.roas.toFixed(2)}x
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-3">
                        <p className="font-medium">MNTN last touch</p>
                        <p className="text-xs text-muted-foreground">
                          MNTN was the last measured advertising touch
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {data.mntn.lastTouchVisits.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {data.mntn.lastTouchConversions.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {currency.format(data.mntn.lastTouchOrderValue)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {data.mntn.lastTouchRoas.toFixed(2)}x
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>CPM {decimalCurrency.format(data.mntn.cpm)}</span>
                <span>
                  Cost / verified visit{" "}
                  {decimalCurrency.format(data.mntn.costPerVerifiedVisit)}
                </span>
                <span>
                  Cost / conversion{" "}
                  {decimalCurrency.format(data.mntn.costPerConversion)}
                </span>
                <span>
                  Accounts:{" "}
                  {data.mntn.advertisers.map((account) => account.name).join(", ")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Daily Eulerity ROAS</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              GA4 session-attributed Eulerity revenue divided by Eulerity spend
              for each studio and day.
            </p>
          </div>
          {data.canManageStrategyChanges ? (
            <Button size="sm" variant="outline" onClick={openStrategyForm}>
              <Plus className="size-4" />
              Add strategy change
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {strategyFormOpen ? (
            <form
              onSubmit={saveStrategyChange}
              className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="strategy-date">Effective date</Label>
                <Input
                  id="strategy-date"
                  type="date"
                  value={strategyDate}
                  onChange={(event) => setStrategyDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="strategy-studio">Studio</Label>
                <select
                  id="strategy-studio"
                  value={strategyStudioId}
                  onChange={(event) => setStrategyStudioId(event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  <option value="all">All studios</option>
                  {studios.map((studio) => (
                    <option key={studio.id} value={studio.id}>
                      {studio.studio_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="strategy-type">Change type</Label>
                <select
                  id="strategy-type"
                  value={strategyType}
                  onChange={(event) =>
                    setStrategyType(event.target.value as StrategyChangeType)
                  }
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  {Object.entries(strategyChangeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="strategy-title">Short description</Label>
                <Input
                  id="strategy-title"
                  value={strategyTitle}
                  onChange={(event) => setStrategyTitle(event.target.value)}
                  placeholder="Increased Search budget 20%"
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
                <Label htmlFor="strategy-notes">Notes (optional)</Label>
                <textarea
                  id="strategy-notes"
                  value={strategyNotes}
                  onChange={(event) => setStrategyNotes(event.target.value)}
                  placeholder="What changed, why it changed, and what outcome you expect."
                  maxLength={1000}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              {strategyError ? (
                <p className="text-sm text-destructive md:col-span-2 xl:col-span-3">
                  {strategyError}
                </p>
              ) : (
                <div className="md:col-span-2 xl:col-span-3" />
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStrategyFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={strategySaving}>
                  {strategySaving ? "Saving…" : "Save change"}
                </Button>
              </div>
            </form>
          ) : null}
          {strategyError && !strategyFormOpen ? (
            <p className="text-sm text-destructive">{strategyError}</p>
          ) : null}
          {data.strategyChanges.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {data.strategyChanges.map((change) => {
                const comparison = strategyRoasComparisons.get(change.id)
                const difference =
                  comparison?.beforeRoas != null && comparison.afterRoas != null
                    ? comparison.afterRoas - comparison.beforeRoas
                    : null
                const percentDifference =
                  difference != null && comparison?.beforeRoas
                    ? (difference / comparison.beforeRoas) * 100
                    : null

                return (
                  <div
                    key={`comparison-${change.id}`}
                    className="rounded-lg border bg-muted/20 p-3"
                  >
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {change.studioName ?? "All studios"} · {change.title}
                    </p>
                    <div className="mt-2 flex items-end gap-2 tabular-nums">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Before</p>
                        <p className="text-xl font-semibold">
                          {comparison?.beforeRoas == null
                            ? "—"
                            : `${comparison.beforeRoas.toFixed(2)}x`}
                        </p>
                      </div>
                      <ArrowRight className="mb-1.5 size-4 text-muted-foreground" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">After</p>
                        <p className="text-xl font-semibold">
                          {comparison?.afterRoas == null
                            ? "—"
                            : `${comparison.afterRoas.toFixed(2)}x`}
                        </p>
                      </div>
                      {difference != null ? (
                        <p
                          className={`mb-1 ml-auto text-sm font-medium ${
                            difference >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {difference >= 0 ? "+" : ""}
                          {difference.toFixed(2)}x
                          {percentDifference != null
                            ? ` (${percentDifference >= 0 ? "+" : ""}${percentDifference.toFixed(1)}%)`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    {comparison ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatChartDate(comparison.beforeStart)}–
                        {formatChartDate(comparison.beforeEnd)} vs. {formatChartDate(comparison.afterStart)}–
                        {formatChartDate(comparison.afterEnd)}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
          {data.eulerityDailyRoas.studios.length &&
          data.eulerityDailyRoas.points.some((point) =>
            data.eulerityDailyRoas.studios.some(
              (studio) => point[studio.dataKey] != null
            )
          ) ? (
            <ChartContainer
              className="h-[340px] w-full"
              config={Object.fromEntries(
                data.eulerityDailyRoas.studios.map((studio, index) => [
                  studio.dataKey,
                  {
                    label: studio.name,
                    color: studioChartColors[index % studioChartColors.length],
                  },
                ])
              )}
            >
              <LineChart
                data={data.eulerityDailyRoas.points}
                margin={{ left: 4, right: 12, top: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickFormatter={formatChartDate}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tickFormatter={(value) => `${Number(value).toFixed(1)}x`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatChartDate(String(value))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {strategyChangesByDate.map(({ date, changes }) => (
                  <ReferenceLine
                    key={date}
                    x={date}
                    stroke="#b45309"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value:
                        changes.length > 1
                          ? `${changes.length} changes`
                          : strategyChangeLabels[changes[0].changeType],
                      position: "insideTopRight",
                      fill: "#b45309",
                      fontSize: 11,
                    }}
                  />
                ))}
                {data.eulerityDailyRoas.studios.map((studio, index) => (
                  <Line
                    key={studio.id}
                    dataKey={studio.dataKey}
                    name={studio.dataKey}
                    type="monotone"
                    stroke={studioChartColors[index % studioChartColors.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-center text-sm text-muted-foreground">
              Daily ROAS will appear when Eulerity spend and matching GA4
              attribution are available for the selected period.
            </div>
          )}
          {data.strategyChanges.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {data.strategyChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex gap-3 rounded-lg border border-amber-600/20 bg-amber-500/5 p-3"
                >
                  <span className="mt-1 h-8 border-l-2 border-dashed border-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      {formatChartDate(change.effectiveDate)} ·{" "}
                      {strategyChangeLabels[change.changeType]}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">{change.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {change.studioName ?? "All studios"}
                      {change.notes ? ` · ${change.notes}` : ""}
                    </p>
                  </div>
                  {data.canManageStrategyChanges ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${change.title}`}
                      onClick={() => removeStrategyChange(change.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.channels.map((channel) => (
              <Link
                key={channel.key}
                href={
                  channel.key === "mntn"
                    ? "#mntn-performance"
                    : `/marketing/${channel.key}`
                }
                className="grid grid-cols-[minmax(110px,1fr)_repeat(4,auto)_auto] items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{channel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {channel.spend > 0
                      ? `${channel.share.toFixed(1)}% of known spend`
                      : "No spend recorded"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Spend</p>
                  <p className="text-sm font-medium tabular-nums">
                    {currency.format(channel.spend)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {channel.key === "mntn" ? "CPM" : "CPC"}
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {decimalCurrency.format(
                      channel.key === "mntn" ? channel.cpm : channel.cpc
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Attributed revenue
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {channel.attributionAvailable
                      ? currency.format(channel.attributedRevenue)
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">ROAS</p>
                  <p className="text-sm font-medium tabular-nums">
                    {channel.attributionAvailable
                      ? `${channel.attributedRoas.toFixed(2)}x`
                      : "—"}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
            <Link href="/operations/ga4" className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-lg px-3 py-3 transition-colors hover:bg-muted">
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
            <p className="text-sm text-muted-foreground">
              Cross-platform delivery and website outcomes from connected data.
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              {
                label: "Impressions",
                value: data.funnel.impressions,
                width: 100,
                color: "from-blue-600 to-blue-500",
              },
              {
                label: "Paid clicks",
                value: data.funnel.clicks,
                width: 82,
                color: "from-blue-500 to-violet-500",
              },
              {
                label: "Website sessions",
                value: data.funnel.sessions,
                width: 64,
                color: "from-violet-500 to-purple-400",
              },
              {
                label: "GA4 key events",
                value: data.funnel.keyEvents,
                width: 46,
                color: "from-emerald-400 to-green-300",
              },
            ].map((stage, index, stages) => {
              const { label, value, width, color } = stage
              const numericValue = Number(value)
              const previousValue =
                index > 0 ? Number(stages[index - 1].value) : null
              const conversionRate =
                previousValue && previousValue > 0
                  ? (numericValue / previousValue) * 100
                  : null

              return (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(120px,1fr)_minmax(150px,220px)] items-center gap-4"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold tabular-nums">
                        {numericValue.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conversionRate === null
                          ? "starting volume"
                          : `${conversionRate.toFixed(1)}% ratio to prior stage`}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-14 items-stretch justify-center">
                    <div
                      className={`flex items-center justify-center bg-gradient-to-r ${color} text-xs font-semibold text-white shadow-sm`}
                      style={{
                        width: `${width}%`,
                        clipPath:
                          index === stages.length - 1
                            ? "polygon(8% 0, 92% 0, 82% 100%, 18% 100%)"
                            : "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
                      }}
                    >
                      {compactNumber.format(numericValue)}
                    </div>
                  </div>
                </div>
              )
            })}
            <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
              Impressions include Meta, Eulerity, and MNTN. Paid clicks exclude
              MNTN because its verified visits are modeled view-through activity,
              not direct clicks. Ratios are directional comparisons across data
              sources, not a single-user journey.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        CPC uses click-platform spend and excludes MNTN Connected TV. Meta and
        Eulerity ROAS use GA4 session-attributed revenue; MNTN ROAS uses
        MNTN&apos;s modeled view-through attribution. Eulerity social remains
        classified as Eulerity, not Meta.
      </p>
    </div>
  )
}
