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

type SourceMediumRow = {
  source: string
  medium: string
  display_name?: string | null
  vendor?: string | null
  marketing_type?: string | null
  traffic_category?: string | null
  reporting_group?: string | null
  visibility?: "Featured" | "Grouped" | "Hidden" | null
  group_label?: string | null
  sort_order?: number | null
  sessions?: number | null
  new_users?: number | null
  key_events?: number | string | null
  total_revenue?: number | string | null
}

type MetaCampaignRow = {
  account_id: string
  account_name: string
  campaign_id: string
  campaign_name: string
  impressions?: number | null
  reach?: number | null
  clicks?: number | null
  spend?: number | string | null
}

type EulerityChannelRow = {
  report_date: string
  spend_total?: number | string | null
  spend_display?: number | string | null
  spend_search?: number | string | null
  spend_social?: number | string | null
  spend_video?: number | string | null
  spend_other?: number | string | null
  impressions_display?: number | null
  impressions_search?: number | null
  impressions_social?: number | null
  impressions_video?: number | null
  impressions_other?: number | null
  clicks_display?: number | null
  clicks_search?: number | null
  clicks_social?: number | null
  clicks_video?: number | null
  clicks_other?: number | null
}

type MntnPerformanceRow = {
  studio_id: number
  advertiser_id: string
  advertiser_name: string
  report_date: string
  spend?: number | string | null
  impressions?: number | null
  households_reached?: number | null
  commercials_aired?: number | null
  verified_visits?: number | string | null
  conversions?: number | string | null
  order_value?: number | string | null
  last_touch_visits?: number | string | null
  last_touch_conversions?: number | string | null
  last_touch_order_value?: number | string | null
  retrieved_at?: string | null
}

type PaidCpcBenchmarkRow = {
  participating?: boolean | null
  available?: boolean | null
  cohort_studios?: number | string | null
  cohort_organizations?: number | string | null
  median_value?: number | string | null
  mean_value?: number | string | null
}

export type MarketingTrend = {
  date: string
  sessions: number
  newUsers: number
  spend: number
  metaSpend: number
  euleritySpend: number
  mntnSpend: number
  clicks: number
  impressions: number
  keyEvents: number
}

export type MarketingDashboard = {
  period: { startDate: string; endDate: string; days: number }
  kpis: {
    paidSpend: number
    attributedRevenue: number
    paidCpc: number
    attributedRoas: number
    attributionAvailable: boolean
    paidCpcBenchmark: {
      participating: boolean
      available: boolean
      cohortStudios: number
      cohortOrganizations: number
      median: number | null
      mean: number | null
    }
    sessions: number
    newUsers: number
    keyEvents: number
  }
  channels: Array<{
    key: "meta" | "eulerity" | "mntn"
    name: string
    spend: number
    clicks: number
    impressions: number
    share: number
    cpc: number
    cpm: number
    attributedRevenue: number
    attributedRoas: number
    attributionAvailable: boolean
  }>
  sourceMedium: Array<{
    name: string
    reportingGroup: string
    vendor: string
    marketingType: string
    trafficCategory: string
    sortOrder: number
    sessions: number
    newUsers: number
    keyEvents: number
    revenue: number
  }>
  metaCampaigns: Array<{
    accountId: string
    accountName: string
    campaignId: string
    campaignName: string
    spend: number
    impressions: number
    reach: number
    clicks: number
    ctr: number
    cpc: number
    cpm: number
  }>
  eulerityChannels: Array<{
    key: "social" | "search" | "display" | "video" | "other"
    name: string
    spend: number
    spendShare: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
  }>
  mntn: {
    advertisers: Array<{ id: string; name: string }>
    studios: Array<{
      id: number
      name: string
      spend: number
      orderValue: number
      roas: number
    }>
    spend: number
    impressions: number
    householdsReached: number
    commercialsAired: number
    verifiedVisits: number
    conversions: number
    orderValue: number
    roas: number
    cpm: number
    costPerVerifiedVisit: number
    costPerConversion: number
    lastTouchVisits: number
    lastTouchConversions: number
    lastTouchOrderValue: number
    lastTouchRoas: number
    latestRetrievedAt: string | null
  }
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
  const sourceMediumQuery = addStudioFilter(
    supabase
      .from("ga4_source_medium_performance")
      .select(
        "source,medium,display_name,vendor,marketing_type,traffic_category,reporting_group,visibility,group_label,sort_order,sessions,new_users,key_events,total_revenue"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const metaCampaignQuery = addStudioFilter(
    supabase
      .from("meta_ads_daily")
      .select(
        "account_id,account_name,campaign_id,campaign_name,impressions,reach,clicks,spend"
      )
      .gte("date_start", periodStart)
      .lte("date_start", periodEnd),
    studioId
  )
  const eulerityChannelQuery = addStudioFilter(
    supabase
      .from("eulerity_daily_metrics")
      .select(
        "report_date,spend_total,spend_display,spend_search,spend_social,spend_video,spend_other,impressions_display,impressions_search,impressions_social,impressions_video,impressions_other,clicks_display,clicks_search,clicks_social,clicks_video,clicks_other"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const mntnQuery = addStudioFilter(
    supabase
      .from("mntn_performance_daily")
      .select(
        "studio_id,advertiser_id,advertiser_name,report_date,spend,impressions,households_reached,commercials_aired,verified_visits,conversions,order_value,last_touch_visits,last_touch_conversions,last_touch_order_value,retrieved_at"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const studiosQuery = supabase
    .from("studios")
    .select("id,studio_name")
    .order("studio_name")

  const paidCpcBenchmarkQuery =
    studioId && studioId !== "all"
      ? supabase.rpc("get_paid_cpc_benchmark", {
          requested_studio_id: Number(studioId),
          period_start: periodStart,
          period_end: periodEnd,
        })
      : Promise.resolve({ data: [], error: null })

  const [
    ga4Result,
    metaResult,
    eulerityResult,
    organicResult,
    { data: sourceMediumData, error: sourceMediumError },
    { data: metaCampaignData, error: metaCampaignError },
    { data: eulerityChannelData, error: eulerityChannelError },
    { data: mntnData, error: mntnError },
    { data: studiosData, error: studiosError },
    { data: paidCpcBenchmarkData, error: paidCpcBenchmarkError },
  ] = await Promise.all([
    ga4Query.order("date"),
    metaQuery.order("integration_date"),
    eulerityQuery.order("report_date"),
    organicQuery.order("insight_date"),
    sourceMediumQuery,
    metaCampaignQuery.range(0, 4999),
    eulerityChannelQuery.range(0, 4999),
    mntnQuery.range(0, 4999),
    studiosQuery,
    paidCpcBenchmarkQuery,
  ])

  const failure =
    ga4Result.error ??
    metaResult.error ??
    eulerityResult.error ??
    organicResult.error
  if (failure) throw failure
  if (
    sourceMediumError &&
    !["42P01", "PGRST204", "PGRST205"].includes(sourceMediumError.code ?? "")
  ) {
    throw sourceMediumError
  }
  if (metaCampaignError) throw metaCampaignError
  if (eulerityChannelError) throw eulerityChannelError
  if (
    mntnError &&
    !["42P01", "PGRST204", "PGRST205"].includes(mntnError.code ?? "")
  ) {
    throw mntnError
  }
  if (studiosError) throw studiosError
  if (
    paidCpcBenchmarkError &&
    !["42883", "PGRST202"].includes(paidCpcBenchmarkError.code ?? "")
  ) {
    throw paidCpcBenchmarkError
  }

  const ga4Rows = (ga4Result.data ?? []) as Ga4Row[]
  const metaRows = (metaResult.data ?? []) as MetaAdsRow[]
  const eulerityRows = (eulerityResult.data ?? []) as EulerityRow[]
  const sourceRows = (sourceMediumData ?? []) as SourceMediumRow[]
  const metaCampaignRows = (metaCampaignData ?? []) as MetaCampaignRow[]
  const eulerityChannelRows = (eulerityChannelData ??
    []) as EulerityChannelRow[]
  const mntnRows = (mntnData ?? []) as MntnPerformanceRow[]
  const paidCpcBenchmarkRow = (
    (paidCpcBenchmarkData ?? []) as PaidCpcBenchmarkRow[]
  )[0]
  const grouped = new Map<string, MarketingTrend>()

  const day = (date: string) => {
    const current = grouped.get(date) ?? {
      date,
      sessions: 0,
      newUsers: 0,
      spend: 0,
      metaSpend: 0,
      euleritySpend: 0,
      mntnSpend: 0,
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

  for (const row of mntnRows) {
    const current = grouped.get(row.report_date) ?? {
      date: row.report_date,
      sessions: 0,
      newUsers: 0,
      spend: 0,
      metaSpend: 0,
      euleritySpend: 0,
      mntnSpend: 0,
      clicks: 0,
      impressions: 0,
      keyEvents: 0,
    }
    const spend = numberValue(row.spend)
    current.spend += spend
    current.mntnSpend += spend
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
      mntnSpend: sum.mntnSpend + row.mntnSpend,
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
      mntnSpend: 0,
      clicks: 0,
      impressions: 0,
      keyEvents: 0,
    }
  )

  const sourceMediumGrouped = new Map<
    string,
    MarketingDashboard["sourceMedium"][number]
  >()
  for (const row of sourceRows) {
    if (row.visibility === "Hidden") continue
    const name =
      row.visibility === "Grouped"
        ? row.group_label ?? "Other Traffic"
        : row.display_name ?? row.source
    const reportingGroup = row.reporting_group ?? "Other Traffic"
    const vendor =
      row.visibility === "Grouped" ? "Various sources" : row.vendor ?? "Unmapped"
    const marketingType =
      row.visibility === "Grouped"
        ? "Referral"
        : row.marketing_type ?? "Unmapped"
    const trafficCategory =
      row.visibility === "Grouped"
        ? reportingGroup
        : row.traffic_category ?? "Unmapped"
    const key = [
      name,
      reportingGroup,
      vendor,
      marketingType,
      trafficCategory,
    ].join("|")
    const current = sourceMediumGrouped.get(key) ?? {
      name,
      reportingGroup,
      vendor,
      marketingType,
      trafficCategory,
      sortOrder: numberValue(row.sort_order),
      sessions: 0,
      newUsers: 0,
      keyEvents: 0,
      revenue: 0,
    }
    current.sessions += numberValue(row.sessions)
    current.newUsers += numberValue(row.new_users)
    current.keyEvents += numberValue(row.key_events)
    current.revenue += numberValue(row.total_revenue)
    sourceMediumGrouped.set(key, current)
  }
  const allSourceMedium = [...sourceMediumGrouped.values()]
  const sourceMedium = [...allSourceMedium]
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        b.revenue - a.revenue ||
        b.sessions - a.sessions
    )
  const attributedRevenueByVendor = (vendor: string) =>
    allSourceMedium
      .filter(
        (row) =>
          row.vendor.toLowerCase() === vendor.toLowerCase() &&
          row.marketingType.toLowerCase() === "paid"
      )
      .reduce((sum, row) => sum + row.revenue, 0)
  const metaClicks = metaRows.reduce(
    (sum, row) => sum + numberValue(row.clicks),
    0
  )
  const eulerityClicks = eulerityRows.reduce(
    (sum, row) => sum + numberValue(row.clicks_total),
    0
  )
  const metaImpressions = metaRows.reduce(
    (sum, row) => sum + numberValue(row.impressions),
    0
  )
  const eulerityImpressions = eulerityRows.reduce(
    (sum, row) => sum + numberValue(row.impressions_total),
    0
  )
  const metaAttributedRevenue = attributedRevenueByVendor("Meta")
  const eulerityAttributedRevenue = attributedRevenueByVendor("Eulerity")
  const attributedRevenue = metaAttributedRevenue + eulerityAttributedRevenue
  const attributionAvailable = sourceRows.length > 0
  const metaCampaignMap = new Map<
    string,
    MarketingDashboard["metaCampaigns"][number]
  >()
  for (const row of metaCampaignRows) {
    const campaignKey = `${row.account_id}|${row.campaign_id}`
    const current = metaCampaignMap.get(campaignKey) ?? {
      accountId: String(row.account_id),
      accountName: row.account_name || "Unnamed account",
      campaignId: String(row.campaign_id),
      campaignName: row.campaign_name || "Unnamed campaign",
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
    }
    current.spend += numberValue(row.spend)
    current.impressions += numberValue(row.impressions)
    current.reach += numberValue(row.reach)
    current.clicks += numberValue(row.clicks)
    metaCampaignMap.set(campaignKey, current)
  }
  const metaCampaigns = [...metaCampaignMap.values()]
    .map((campaign) => ({
      ...campaign,
      ctr: campaign.impressions
        ? (campaign.clicks / campaign.impressions) * 100
        : 0,
      cpc: campaign.clicks ? campaign.spend / campaign.clicks : 0,
      cpm: campaign.impressions
        ? (campaign.spend / campaign.impressions) * 1000
        : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
  const eulerityChannelDefinitions = [
    {
      key: "social",
      name: "Social",
      spendField: "spend_social",
      impressionsField: "impressions_social",
      clicksField: "clicks_social",
    },
    {
      key: "search",
      name: "Search",
      spendField: "spend_search",
      impressionsField: "impressions_search",
      clicksField: "clicks_search",
    },
    {
      key: "display",
      name: "Display",
      spendField: "spend_display",
      impressionsField: "impressions_display",
      clicksField: "clicks_display",
    },
    {
      key: "video",
      name: "Video",
      spendField: "spend_video",
      impressionsField: "impressions_video",
      clicksField: "clicks_video",
    },
    {
      key: "other",
      name: "Other",
      spendField: "spend_other",
      impressionsField: "impressions_other",
      clicksField: "clicks_other",
    },
  ] as const
  const eulerityChannelBase = eulerityChannelDefinitions.map((definition) => {
    const totals = eulerityChannelRows.reduce(
      (sum, row) => ({
        spend: sum.spend + numberValue(row[definition.spendField]),
        impressions:
          sum.impressions + numberValue(row[definition.impressionsField]),
        clicks: sum.clicks + numberValue(row[definition.clicksField]),
      }),
      { spend: 0, impressions: 0, clicks: 0 }
    )

    return { ...definition, ...totals }
  })
  const eulerityChannelSpend = eulerityChannelBase.reduce(
    (sum, channel) => sum + channel.spend,
    0
  )
  const eulerityChannels = eulerityChannelBase.map((channel) => ({
    key: channel.key,
    name: channel.name,
    spend: channel.spend,
    spendShare: eulerityChannelSpend
      ? (channel.spend / eulerityChannelSpend) * 100
      : 0,
    impressions: channel.impressions,
    clicks: channel.clicks,
    ctr: channel.impressions
      ? (channel.clicks / channel.impressions) * 100
      : 0,
    cpc: channel.clicks ? channel.spend / channel.clicks : 0,
  }))
  const mntnTotals = mntnRows.reduce(
    (sum, row) => ({
      spend: sum.spend + numberValue(row.spend),
      impressions: sum.impressions + numberValue(row.impressions),
      householdsReached:
        sum.householdsReached + numberValue(row.households_reached),
      commercialsAired:
        sum.commercialsAired + numberValue(row.commercials_aired),
      verifiedVisits: sum.verifiedVisits + numberValue(row.verified_visits),
      conversions: sum.conversions + numberValue(row.conversions),
      orderValue: sum.orderValue + numberValue(row.order_value),
      lastTouchVisits:
        sum.lastTouchVisits + numberValue(row.last_touch_visits),
      lastTouchConversions:
        sum.lastTouchConversions + numberValue(row.last_touch_conversions),
      lastTouchOrderValue:
        sum.lastTouchOrderValue + numberValue(row.last_touch_order_value),
    }),
    {
      spend: 0,
      impressions: 0,
      householdsReached: 0,
      commercialsAired: 0,
      verifiedVisits: 0,
      conversions: 0,
      orderValue: 0,
      lastTouchVisits: 0,
      lastTouchConversions: 0,
      lastTouchOrderValue: 0,
    }
  )
  const mntnAdvertisers = [
    ...new Map(
      mntnRows.map((row) => [
        row.advertiser_id,
        { id: row.advertiser_id, name: row.advertiser_name },
      ])
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))
  const studioNames = new Map(
    (studiosData ?? []).map((studio) => [
      Number(studio.id),
      String(studio.studio_name),
    ])
  )
  const mntnStudioTotals = new Map<
    number,
    { spend: number; orderValue: number }
  >()
  for (const row of mntnRows) {
    const current = mntnStudioTotals.get(row.studio_id) ?? {
      spend: 0,
      orderValue: 0,
    }
    current.spend += numberValue(row.spend)
    current.orderValue += numberValue(row.order_value)
    mntnStudioTotals.set(row.studio_id, current)
  }
  const mntnStudios = [...mntnStudioTotals.entries()]
    .map(([id, totals]) => ({
      id,
      name: studioNames.get(id) ?? `Studio ${id}`,
      ...totals,
      roas: totals.spend ? totals.orderValue / totals.spend : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const latestMntnRetrievedAt =
    mntnRows
      .map((row) => row.retrieved_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null
  const knownChannelSpend =
    totals.metaSpend + totals.euleritySpend + mntnTotals.spend
  const channelBase = knownChannelSpend || totals.spend
  const clickPlatformSpend =
    totals.metaSpend + totals.euleritySpend || totals.spend - mntnTotals.spend
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
      attributedRevenue,
      paidCpc: totals.clicks ? clickPlatformSpend / totals.clicks : 0,
      attributedRoas: clickPlatformSpend
        ? attributedRevenue / clickPlatformSpend
        : 0,
      attributionAvailable,
      paidCpcBenchmark: {
        participating: Boolean(paidCpcBenchmarkRow?.participating),
        available: Boolean(paidCpcBenchmarkRow?.available),
        cohortStudios: numberValue(paidCpcBenchmarkRow?.cohort_studios),
        cohortOrganizations: numberValue(
          paidCpcBenchmarkRow?.cohort_organizations
        ),
        median:
          paidCpcBenchmarkRow?.median_value == null
            ? null
            : numberValue(paidCpcBenchmarkRow.median_value),
        mean:
          paidCpcBenchmarkRow?.mean_value == null
            ? null
            : numberValue(paidCpcBenchmarkRow.mean_value),
      },
      sessions: totals.sessions,
      newUsers: totals.newUsers,
      keyEvents: totals.keyEvents,
    },
    channels: [
      {
        key: "meta",
        name: "Meta Ads",
        spend: totals.metaSpend,
        clicks: metaClicks,
        impressions: metaImpressions,
        share: channelBase ? (totals.metaSpend / channelBase) * 100 : 0,
        cpc: metaClicks ? totals.metaSpend / metaClicks : 0,
        cpm: metaImpressions
          ? (totals.metaSpend / metaImpressions) * 1000
          : 0,
        attributedRevenue: metaAttributedRevenue,
        attributedRoas: totals.metaSpend
          ? metaAttributedRevenue / totals.metaSpend
          : 0,
        attributionAvailable,
      },
      {
        key: "eulerity",
        name: "Eulerity",
        spend: totals.euleritySpend,
        clicks: eulerityClicks,
        impressions: eulerityImpressions,
        share: channelBase ? (totals.euleritySpend / channelBase) * 100 : 0,
        cpc: eulerityClicks ? totals.euleritySpend / eulerityClicks : 0,
        cpm: eulerityImpressions
          ? (totals.euleritySpend / eulerityImpressions) * 1000
          : 0,
        attributedRevenue: eulerityAttributedRevenue,
        attributedRoas: totals.euleritySpend
          ? eulerityAttributedRevenue / totals.euleritySpend
          : 0,
        attributionAvailable,
      },
      ...(mntnAdvertisers.length
        ? [
            {
              key: "mntn" as const,
              name: "MNTN Connected TV",
              spend: mntnTotals.spend,
              clicks: 0,
              impressions: mntnTotals.impressions,
              share: channelBase
                ? (mntnTotals.spend / channelBase) * 100
                : 0,
              cpc: 0,
              cpm: mntnTotals.impressions
                ? (mntnTotals.spend / mntnTotals.impressions) * 1000
                : 0,
              attributedRevenue: mntnTotals.orderValue,
              attributedRoas: mntnTotals.spend
                ? mntnTotals.orderValue / mntnTotals.spend
                : 0,
              attributionAvailable: true,
            },
          ]
        : []),
    ],
    metaCampaigns,
    eulerityChannels,
    mntn: {
      advertisers: mntnAdvertisers,
      studios: mntnStudios,
      ...mntnTotals,
      roas: mntnTotals.spend ? mntnTotals.orderValue / mntnTotals.spend : 0,
      cpm: mntnTotals.impressions
        ? (mntnTotals.spend / mntnTotals.impressions) * 1000
        : 0,
      costPerVerifiedVisit: mntnTotals.verifiedVisits
        ? mntnTotals.spend / mntnTotals.verifiedVisits
        : 0,
      costPerConversion: mntnTotals.conversions
        ? mntnTotals.spend / mntnTotals.conversions
        : 0,
      lastTouchRoas: mntnTotals.spend
        ? mntnTotals.lastTouchOrderValue / mntnTotals.spend
        : 0,
      latestRetrievedAt: latestMntnRetrievedAt,
    },
    sourceMedium,
    trends,
    funnel: {
      impressions: totals.impressions + mntnTotals.impressions,
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
