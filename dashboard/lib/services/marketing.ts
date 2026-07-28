import { supabase } from "@/lib/supabase/server"

type MarketingRow = {
  report_date: string
  sessions?: number | null
  new_users?: number | null
  total_users?: number | null
  engaged_sessions?: number | null
  engagement_rate?: number | string | null
  key_events?: number | string | null
  paid_spend?: number | string | null
  paid_clicks?: number | null
  paid_impressions?: number | null
  meta_spend?: number | string | null
  meta_ads_spend?: number | string | null
  eulerity_spend?: number | string | null
  meta_clicks?: number | null
  eulerity_clicks?: number | null
  meta_impressions?: number | null
  eulerity_impressions?: number | null
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

export async function getMarketingDashboard(
  studioId?: string,
  startDate?: string,
  endDate?: string
): Promise<MarketingDashboard> {
  const periodEnd = endDate ?? new Date().toISOString().slice(0, 10)
  const fallbackStart = new Date(`${periodEnd}T00:00:00Z`)
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 29)
  const periodStart = startDate ?? fallbackStart.toISOString().slice(0, 10)

  let query = supabase
    .from("marketing_daily_summary")
    .select("*")
    .gte("report_date", periodStart)
    .lte("report_date", periodEnd)

  if (studioId && studioId !== "all") {
    query = query.eq("studio_id", studioId)
  }

  let organicQuery = supabase
    .from("meta_page_insights_daily")
    .select("insight_date,metric")
    .gte("insight_date", periodStart)
    .lte("insight_date", periodEnd)

  if (studioId && studioId !== "all") {
    organicQuery = organicQuery.eq("studio_id", studioId)
  }

  const [
    { data, error },
    { data: organicRows, error: organicError },
  ] = await Promise.all([
    query.order("report_date"),
    organicQuery.order("insight_date"),
  ])

  if (error) throw error
  if (organicError) throw organicError

  const rows = (data ?? []) as MarketingRow[]
  const grouped = new Map<string, MarketingTrend>()

  for (const row of rows) {
    const current = grouped.get(row.report_date) ?? {
      date: row.report_date,
      sessions: 0,
      newUsers: 0,
      spend: 0,
      metaSpend: 0,
      euleritySpend: 0,
      clicks: 0,
      impressions: 0,
      keyEvents: 0,
    }

    current.sessions += numberValue(row.sessions)
    current.newUsers += numberValue(row.new_users)
    current.spend += numberValue(row.paid_spend)
    current.metaSpend += numberValue(row.meta_spend ?? row.meta_ads_spend)
    current.euleritySpend += numberValue(row.eulerity_spend)
    current.clicks += numberValue(row.paid_clicks)
    current.impressions += numberValue(row.paid_impressions)
    current.keyEvents += numberValue(row.key_events)
    grouped.set(row.report_date, current)
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

  const engagedSessions = rows.reduce(
    (sum, row) => sum + numberValue(row.engaged_sessions),
    0
  )
  const weightedEngagement = totals.sessions
    ? (engagedSessions / totals.sessions) * 100
    : rows.length
      ? rows.reduce(
          (sum, row) => sum + numberValue(row.engagement_rate),
          0
        ) / rows.length
      : 0
  const knownChannelSpend = totals.metaSpend + totals.euleritySpend
  const channelBase = knownChannelSpend || totals.spend
  const organicDates = new Set(
    (organicRows ?? []).map((row) => String(row.insight_date))
  )
  const organicMetrics = new Set(
    (organicRows ?? []).map((row) => String(row.metric))
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
      engagementRate: weightedEngagement,
    },
    channels: [
      {
        key: "meta",
        name: "Meta Ads",
        spend: totals.metaSpend,
        clicks: rows.reduce(
          (sum, row) => sum + numberValue(row.meta_clicks),
          0
        ),
        impressions: rows.reduce(
          (sum, row) => sum + numberValue(row.meta_impressions),
          0
        ),
        share: channelBase ? (totals.metaSpend / channelBase) * 100 : 0,
      },
      {
        key: "eulerity",
        name: "Eulerity",
        spend: totals.euleritySpend,
        clicks: rows.reduce(
          (sum, row) => sum + numberValue(row.eulerity_clicks),
          0
        ),
        impressions: rows.reduce(
          (sum, row) => sum + numberValue(row.eulerity_impressions),
          0
        ),
        share: channelBase ? (totals.euleritySpend / channelBase) * 100 : 0,
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
