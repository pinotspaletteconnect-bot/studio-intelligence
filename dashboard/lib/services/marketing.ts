import { supabase } from "@/lib/supabase/server"

type Ga4Row = {
  date: string
  sessions: number | null
  new_users: number | null
  engaged_sessions: number | null
  key_events: number | string | null
}

type MetaAdsRow = {
  integration_date: string
  spend: number | string | null
  clicks: number | null
  impressions: number | null
}

type EulerityRow = {
  report_date: string
  spend_total: number | string | null
  clicks_total: number | null
  impressions_total: number | null
}

export type MarketingTrend = {
  date: string
  sessions: number
  newUsers: number
  spend: number
  metaSpend: number
  euleritySpend: number
  clicks: number
  impressions: number
  keyEvents: number
}

export type MarketingDashboard = {
  period: { startDate: string; endDate: string; days: number }
  kpis: {
    paidSpend: number
    sessions: number
    newUsers: number
    costPerSession: number
    keyEvents: number
    engagementRate: number
  }
  channels: Array<{
    key: "meta" | "eulerity"
    name: string
    spend: number
    clicks: number
    impressions: number
    share: number
  }>
  trends: MarketingTrend[]
  funnel: {
    impressions: number
    clicks: number
    sessions: number
    keyEvents: number
  }
  organic: {
    daysWithData: number
    latestDate: string | null
    metricCount: number
  }
}

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function addStudioFilter<T>(
  query: T,
  studioId?: string
): T {
  if (studioId && studioId !== "all") {
    return (query as T & { eq: (column: string, value: string) => T }).eq(
      "studio_id",
      studioId
    )
  }
  return query
}

export async function getMarketingDashboard(
  studioId?: string,
  startDate?: string,
  endDate?: string
): Promise<MarketingDashboard> {
  const periodEnd = endDate ?? new Date().toISOString().slice(0, 10)
  const fallbackStart = new Date(`${periodEnd}T00:00:00Z`)
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 29)
  const periodStart = startDate ?? fallbackStart.toISOString().slice(0, 10)

  const ga4Query = addStudioFilter(
    supabase
      .from("ga4_daily_metrics")
      .select("date,sessions,new_users,engaged_sessions,key_events")
      .gte("date", periodStart)
      .lte("date", periodEnd),
    studioId
  )
  const metaQuery = addStudioFilter(
    supabase
      .from("meta_ads_daily")
      .select("integration_date,spend,clicks,impressions")
      .gte("integration_date", periodStart)
      .lte("integration_date", periodEnd),
    studioId
  )
  const eulerityQuery = addStudioFilter(
    supabase
      .from("eulerity_daily_metrics")
      .select("report_date,spend_total,clicks_total,impressions_total")
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const organicQuery = addStudioFilter(
    supabase
      .from("meta_page_insights_daily")
      .select("insight_date,metric")
      .gte("insight_date", periodStart)
      .lte("insight_date", periodEnd),
    studioId
  )

  const [ga4Result, metaResult, eulerityResult, organicResult] =
    await Promise.all([
      ga4Query.order("date"),
      metaQuery.order("integration_date"),
      eulerityQuery.order("report_date"),
      organicQuery.order("insight_date"),
    ])

  const failure =
    ga4Result.error ??
    metaResult.error ??
    eulerityResult.error ??
    organicResult.error
  if (failure) throw failure

  const ga4Rows = (ga4Result.data ?? []) as Ga4Row[]
  const metaRows = (metaResult.data ?? []) as MetaAdsRow[]
  const eulerityRows = (eulerityResult.data ?? []) as EulerityRow[]
  const grouped = new Map<string, MarketingTrend>()

  const day = (date: string) => {
    const current = grouped.get(date) ?? {
      date,
      sessions: 0,
      newUsers: 0,
      spend: 0,
      metaSpend: 0,
      euleritySpend: 0,
      clicks: 0,
      impressions: 0,
      keyEvents: 0,
    }
    grouped.set(date, current)
    return current
  }

  for (const row of ga4Rows) {
    const current = day(row.date)
    current.sessions += numberValue(row.sessions)
    current.newUsers += numberValue(row.new_users)
    current.keyEvents += numberValue(row.key_events)
  }

  for (const row of metaRows) {
    const current = day(row.integration_date)
    const spend = numberValue(row.spend)
    current.metaSpend += spend
    current.spend += spend
    current.clicks += numberValue(row.clicks)
    current.impressions += numberValue(row.impressions)
  }

  for (const row of eulerityRows) {
    const current = day(row.report_date)
    const spend = numberValue(row.spend_total)
    current.euleritySpend += spend
    current.spend += spend
    current.clicks += numberValue(row.clicks_total)
    current.impressions += numberValue(row.impressions_total)
  }

  const trends = [...grouped.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  const totals = trends.reduce(
    (sum, row) => ({
      sessions: sum.sessions + row.sessions,
      newUsers: sum.newUsers + row.newUsers,
      spend: sum.spend + row.spend,
      metaSpend: sum.metaSpend + row.metaSpend,
      euleritySpend: sum.euleritySpend + row.euleritySpend,
      clicks: sum.clicks + row.clicks,
      impressions: sum.impressions + row.impressions,
      keyEvents: sum.keyEvents + row.keyEvents,
    }),
    {
      sessions: 0,
      newUsers: 0,
      spend: 0,
      metaSpend: 0,
      euleritySpend: 0,
      clicks: 0,
      impressions: 0,
      keyEvents: 0,
    }
  )

  const engagedSessions = ga4Rows.reduce(
    (sum, row) => sum + numberValue(row.engaged_sessions),
    0
  )
  const organicDates = new Set(
    (organicResult.data ?? []).map((row) => String(row.insight_date))
  )
  const organicMetrics = new Set(
    (organicResult.data ?? []).map((row) => String(row.metric))
  )

  return {
    period: {
      startDate: periodStart,
      endDate: periodEnd,
      days:
        Math.round(
          (Date.parse(periodEnd) - Date.parse(periodStart)) / 86_400_000
        ) + 1,
    },
    kpis: {
      paidSpend: totals.spend,
      sessions: totals.sessions,
      newUsers: totals.newUsers,
      costPerSession: totals.sessions ? totals.spend / totals.sessions : 0,
      keyEvents: totals.keyEvents,
      engagementRate: totals.sessions
        ? (engagedSessions / totals.sessions) * 100
        : 0,
    },
    channels: [
      {
        key: "meta",
        name: "Meta Ads",
        spend: totals.metaSpend,
        clicks: metaRows.reduce(
          (sum, row) => sum + numberValue(row.clicks),
          0
        ),
        impressions: metaRows.reduce(
          (sum, row) => sum + numberValue(row.impressions),
          0
        ),
        share: totals.spend ? (totals.metaSpend / totals.spend) * 100 : 0,
      },
      {
        key: "eulerity",
        name: "Eulerity",
        spend: totals.euleritySpend,
        clicks: eulerityRows.reduce(
          (sum, row) => sum + numberValue(row.clicks_total),
          0
        ),
        impressions: eulerityRows.reduce(
          (sum, row) => sum + numberValue(row.impressions_total),
          0
        ),
        share: totals.spend ? (totals.euleritySpend / totals.spend) * 100 : 0,
      },
    ],
    trends,
    funnel: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      sessions: totals.sessions,
      keyEvents: totals.keyEvents,
    },
    organic: {
      daysWithData: organicDates.size,
      latestDate: organicDates.size
        ? [...organicDates].sort().at(-1) ?? null
        : null,
      metricCount: organicMetrics.size,
    },
  }
}
