import { supabase } from "@/lib/supabase/server"

type DailyRow = {
  report_date: string
  active_users: number | string | null
  total_users: number | string | null
  new_users: number | string | null
  sessions: number | string | null
  engaged_sessions: number | string | null
  page_views: number | string | null
  average_session_duration: number | string | null
  key_events: number | string | null
  ecommerce_purchases: number | string | null
  purchase_revenue: number | string | null
}

type BreakdownRow = {
  breakdown_type: "country" | "city" | "device_category" | "operating_system" | "source_medium"
  dimension_value: string
  dimension_secondary: string
  sessions: number | string | null
  active_users: number | string | null
  new_users: number | string | null
  key_events: number | string | null
  total_revenue: number | string | null
}

type ContentRow = {
  page_path: string
  page_views: number | string | null
  active_users: number | string | null
  key_events: number | string | null
  total_revenue: number | string | null
}

type EventRow = {
  event_name: string
  event_count: number | string | null
  active_users: number | string | null
  total_revenue: number | string | null
}

type Totals = {
  activeUsers: number
  totalUsers: number
  newUsers: number
  sessions: number
  engagedSessions: number
  pageViews: number
  sessionDurationSeconds: number
  keyEvents: number
  ecommercePurchases: number
  purchaseRevenue: number
}

export type Ga4Kpi = { value: number; change: number | null }

export type Ga4NorthAmericaDashboard = {
  scope: "North America"
  period: { startDate: string; endDate: string }
  comparisonPeriod: { startDate: string; endDate: string }
  configured: boolean
  hasData: boolean
  kpis: {
    activeUsers: Ga4Kpi
    sessions: Ga4Kpi
    newUsers: Ga4Kpi
    engagementRate: Ga4Kpi
    pageViewsPerUser: Ga4Kpi
    averageEngagementTime: Ga4Kpi
    keyEvents: Ga4Kpi
    purchases: Ga4Kpi
    purchaseRevenue: Ga4Kpi
    conversionRate: Ga4Kpi
  }
  trends: Array<{
    date: string
    activeUsers: number
    sessions: number
    purchaseRevenue: number
  }>
  countries: Ga4Breakdown[]
  cities: Ga4Breakdown[]
  devices: Ga4Breakdown[]
  operatingSystems: Ga4Breakdown[]
  sources: Ga4Breakdown[]
  pages: Array<{ name: string; views: number; activeUsers: number; keyEvents: number; revenue: number }>
  events: Array<{ name: string; count: number; activeUsers: number; revenue: number }>
}

export type Ga4Breakdown = {
  name: string
  secondary: string
  sessions: number
  activeUsers: number
  newUsers: number
  keyEvents: number
  revenue: number
}

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function addStudioFilter<T>(query: T, studioId?: string, allowedStudioIds?: number[]): T {
  if (studioId && studioId !== "all") {
    return (query as T & { eq: (column: string, value: string) => T }).eq("studio_id", studioId)
  }
  if (allowedStudioIds) {
    return (query as T & { in: (column: string, values: number[]) => T }).in("studio_id", allowedStudioIds)
  }
  return query
}

function totals(rows: DailyRow[]): Totals {
  const result = rows.reduce<Totals>((sum, row) => {
    const sessions = numberValue(row.sessions)
    return {
      activeUsers: sum.activeUsers + numberValue(row.active_users),
      totalUsers: sum.totalUsers + numberValue(row.total_users),
      newUsers: sum.newUsers + numberValue(row.new_users),
      sessions: sum.sessions + sessions,
      engagedSessions: sum.engagedSessions + numberValue(row.engaged_sessions),
      pageViews: sum.pageViews + numberValue(row.page_views),
      sessionDurationSeconds: sum.sessionDurationSeconds + numberValue(row.average_session_duration) * sessions,
      keyEvents: sum.keyEvents + numberValue(row.key_events),
      ecommercePurchases: sum.ecommercePurchases + numberValue(row.ecommerce_purchases),
      purchaseRevenue: sum.purchaseRevenue + numberValue(row.purchase_revenue),
    }
  }, { activeUsers: 0, totalUsers: 0, newUsers: 0, sessions: 0, engagedSessions: 0, pageViews: 0, sessionDurationSeconds: 0, keyEvents: 0, ecommercePurchases: 0, purchaseRevenue: 0 })
  return result
}

const change = (current: number, previous: number) => previous ? ((current - previous) / Math.abs(previous)) * 100 : null
const metric = (current: number, previous: number): Ga4Kpi => ({ value: current, change: change(current, previous) })
const BREAKDOWN_PAGE_SIZE = 1000

function groupBreakdowns(rows: BreakdownRow[], type: BreakdownRow["breakdown_type"], limit = 10) {
  const grouped = new Map<string, Ga4Breakdown>()
  for (const row of rows.filter(item => item.breakdown_type === type)) {
    const key = `${row.dimension_value}|${row.dimension_secondary}`
    const item = grouped.get(key) ?? { name: row.dimension_value, secondary: row.dimension_secondary, sessions: 0, activeUsers: 0, newUsers: 0, keyEvents: 0, revenue: 0 }
    item.sessions += numberValue(row.sessions)
    item.activeUsers += numberValue(row.active_users)
    item.newUsers += numberValue(row.new_users)
    item.keyEvents += numberValue(row.key_events)
    item.revenue += numberValue(row.total_revenue)
    grouped.set(key, item)
  }
  return [...grouped.values()].sort((a, b) => b.sessions - a.sessions || b.activeUsers - a.activeUsers).slice(0, limit)
}

export async function getGa4NorthAmericaDashboard(
  studioId: string | undefined,
  startDate: string,
  endDate: string,
  allowedStudioIds: number[],
  comparisonMode: "previous" | "priorYearWeek" | "custom" = "previous",
  customComparisonStart?: string,
  customComparisonEnd?: string
): Promise<Ga4NorthAmericaDashboard> {
  const periodDays = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1
  const useCustomComparison = comparisonMode === "custom" && Boolean(customComparisonStart && customComparisonEnd)
  const comparisonEnd = useCustomComparison
    ? customComparisonEnd!
    : comparisonMode === "priorYearWeek"
      ? shiftDate(endDate, -364)
      : shiftDate(startDate, -1)
  const comparisonStart = useCustomComparison
    ? customComparisonStart!
    : comparisonMode === "priorYearWeek"
      ? shiftDate(startDate, -364)
      : shiftDate(comparisonEnd, -(periodDays - 1))
  const dailySelect = "report_date,active_users,total_users,new_users,sessions,engaged_sessions,page_views,average_session_duration,key_events,ecommerce_purchases,purchase_revenue"

  const currentDailyQuery = addStudioFilter(supabase.from("ga4_north_america_daily_metrics").select(dailySelect).gte("report_date", startDate).lte("report_date", endDate), studioId, allowedStudioIds)
  const previousDailyQuery = addStudioFilter(supabase.from("ga4_north_america_daily_metrics").select(dailySelect).gte("report_date", comparisonStart).lte("report_date", comparisonEnd), studioId, allowedStudioIds)
  const currentKeyEventsQuery = addStudioFilter(supabase.from("ga4_north_america_breakdown_daily").select("key_events").eq("breakdown_type", "country").gte("report_date", startDate).lte("report_date", endDate), studioId, allowedStudioIds)
  const previousKeyEventsQuery = addStudioFilter(supabase.from("ga4_north_america_breakdown_daily").select("key_events").eq("breakdown_type", "country").gte("report_date", comparisonStart).lte("report_date", comparisonEnd), studioId, allowedStudioIds)
  const contentQuery = addStudioFilter(supabase.from("ga4_north_america_content_daily").select("page_path,page_views,active_users,key_events,total_revenue").gte("report_date", startDate).lte("report_date", endDate), studioId, allowedStudioIds)
  const eventQuery = addStudioFilter(supabase.from("ga4_north_america_event_daily").select("event_name,event_count,active_users,total_revenue").gte("report_date", startDate).lte("report_date", endDate), studioId, allowedStudioIds)

  async function loadBreakdown(type: BreakdownRow["breakdown_type"]) {
    const rows: BreakdownRow[] = []
    for (let offset = 0; ; offset += BREAKDOWN_PAGE_SIZE) {
      const query = addStudioFilter(
        supabase
          .from("ga4_north_america_breakdown_daily")
          .select("breakdown_type,dimension_value,dimension_secondary,sessions,active_users,new_users,key_events,total_revenue")
          .eq("breakdown_type", type)
          .gte("report_date", startDate)
          .lte("report_date", endDate)
          .order("report_date")
          .order("studio_id")
          .order("dimension_value")
          .order("dimension_secondary")
          .range(offset, offset + BREAKDOWN_PAGE_SIZE - 1),
        studioId,
        allowedStudioIds
      )
      const result = await query
      if (result.error) return { data: rows, error: result.error }
      const page = (result.data ?? []) as BreakdownRow[]
      rows.push(...page)
      if (page.length < BREAKDOWN_PAGE_SIZE) return { data: rows, error: null }
    }
  }

  const breakdownTypes: BreakdownRow["breakdown_type"][] = ["country", "city", "device_category", "operating_system", "source_medium"]
  const [currentResult, previousResult, breakdownResults, currentKeyEventsResult, previousKeyEventsResult, contentResult, eventResult] = await Promise.all([
    currentDailyQuery.order("report_date"), previousDailyQuery.order("report_date"), Promise.all(breakdownTypes.map(loadBreakdown)), currentKeyEventsQuery, previousKeyEventsQuery, contentQuery.range(0, 9999), eventQuery.range(0, 9999),
  ])
  const errors = [currentResult.error, previousResult.error, ...breakdownResults.map(result => result.error), currentKeyEventsResult.error, previousKeyEventsResult.error, contentResult.error, eventResult.error].filter(Boolean)
  const missingTables = errors.length > 0 && errors.every(error => ["42P01", "PGRST204", "PGRST205"].includes(error?.code ?? ""))
  if (errors.length && !missingTables) throw errors[0]

  const currentRows = (currentResult.data ?? []) as DailyRow[]
  const previousRows = (previousResult.data ?? []) as DailyRow[]
  const current = totals(currentRows)
  const previous = totals(previousRows)
  const currentKeyEvents = (currentKeyEventsResult.data ?? []).reduce((sum, row) => sum + numberValue(row.key_events), 0)
  const previousKeyEvents = (previousKeyEventsResult.data ?? []).reduce((sum, row) => sum + numberValue(row.key_events), 0)
  const currentAverageDailyActiveUsers = current.activeUsers / periodDays
  const previousAverageDailyActiveUsers = previous.activeUsers / periodDays
  const currentEngagementRate = current.sessions ? (current.engagedSessions / current.sessions) * 100 : 0
  const previousEngagementRate = previous.sessions ? (previous.engagedSessions / previous.sessions) * 100 : 0
  const currentDuration = current.sessions ? current.sessionDurationSeconds / current.sessions : 0
  const previousDuration = previous.sessions ? previous.sessionDurationSeconds / previous.sessions : 0
  const currentConversion = current.sessions ? (current.ecommercePurchases / current.sessions) * 100 : 0
  const previousConversion = previous.sessions ? (previous.ecommercePurchases / previous.sessions) * 100 : 0
  const daily = new Map<string, Ga4NorthAmericaDashboard["trends"][number]>()
  for (const row of currentRows) {
    const item = daily.get(row.report_date) ?? { date: row.report_date, activeUsers: 0, sessions: 0, purchaseRevenue: 0 }
    item.activeUsers += numberValue(row.active_users)
    item.sessions += numberValue(row.sessions)
    item.purchaseRevenue += numberValue(row.purchase_revenue)
    daily.set(row.report_date, item)
  }

  const content = new Map<string, Ga4NorthAmericaDashboard["pages"][number]>()
  for (const row of (contentResult.data ?? []) as ContentRow[]) {
    const item = content.get(row.page_path) ?? { name: row.page_path, views: 0, activeUsers: 0, keyEvents: 0, revenue: 0 }
    item.views += numberValue(row.page_views); item.activeUsers += numberValue(row.active_users); item.keyEvents += numberValue(row.key_events); item.revenue += numberValue(row.total_revenue)
    content.set(row.page_path, item)
  }
  const events = new Map<string, Ga4NorthAmericaDashboard["events"][number]>()
  for (const row of (eventResult.data ?? []) as EventRow[]) {
    const item = events.get(row.event_name) ?? { name: row.event_name, count: 0, activeUsers: 0, revenue: 0 }
    item.count += numberValue(row.event_count); item.activeUsers += numberValue(row.active_users); item.revenue += numberValue(row.total_revenue)
    events.set(row.event_name, item)
  }
  const breakdownRows = breakdownResults.flatMap(result => result.data)

  return {
    scope: "North America", period: { startDate, endDate }, comparisonPeriod: { startDate: comparisonStart, endDate: comparisonEnd }, configured: !missingTables, hasData: currentRows.length > 0,
    kpis: {
      activeUsers: metric(currentAverageDailyActiveUsers, previousAverageDailyActiveUsers), sessions: metric(current.sessions, previous.sessions), newUsers: metric(current.newUsers, previous.newUsers),
      engagementRate: metric(currentEngagementRate, previousEngagementRate), pageViewsPerUser: metric(current.activeUsers ? current.pageViews / current.activeUsers : 0, previous.activeUsers ? previous.pageViews / previous.activeUsers : 0),
      averageEngagementTime: metric(currentDuration, previousDuration), keyEvents: metric(currentKeyEvents, previousKeyEvents), purchases: metric(current.ecommercePurchases, previous.ecommercePurchases),
      purchaseRevenue: metric(current.purchaseRevenue, previous.purchaseRevenue), conversionRate: metric(currentConversion, previousConversion),
    },
    trends: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    countries: groupBreakdowns(breakdownRows, "country"), cities: groupBreakdowns(breakdownRows, "city", 12), devices: groupBreakdowns(breakdownRows, "device_category"),
    operatingSystems: groupBreakdowns(breakdownRows, "operating_system"), sources: groupBreakdowns(breakdownRows, "source_medium", 15),
    pages: [...content.values()].sort((a, b) => b.views - a.views).slice(0, 12), events: [...events.values()].sort((a, b) => b.count - a.count).slice(0, 12),
  }
}
