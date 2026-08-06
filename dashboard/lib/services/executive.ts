import { getMarketingDashboard, type MarketingDashboard } from "@/lib/services/marketing"
import {
  getOperationsDashboard,
  getOperationsDashboardWithComparison,
  type OperationsDashboardData,
} from "@/lib/services/operations"
import { getUpcomingClasses } from "@/lib/services/upcoming-classes"
import { supabase } from "@/lib/supabase/server"

export type ExecutiveDashboardData = {
  period: OperationsDashboardData["period"]
  comparison: OperationsDashboardData["comparison"]
  operations: OperationsDashboardData
  marketing: MarketingDashboard
  marketingComparison: MarketingDashboard
  thisWeek: {
    startDate: string
    endDate: string
    completedThrough: string | null
    salesWeekToDate: number
    seatsWeekToDate: number
    futureBookedRevenue: number
    futureBookedSeats: number
    futureClasses: number
    privateParties: number
    mobileEvents: number
  }
  thisWeekComparison: {
    startDate: string
    endDate: string
    completedThrough: string
    snapshotDate: string | null
    salesWeekToDate: number
    seatsWeekToDate: number
    futureBookedRevenue: number | null
    futureBookedSeats: number | null
    futureClasses: number | null
    privateParties: number | null
    mobileEvents: number | null
  }
  weeklySales: Array<{
    startDate: string
    endDate: string
    sales: number
    seats: number
    studios: Array<{
      studioId: number
      studioName: string
      sales: number
    }>
  }>
}

const shiftIsoDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

async function getHistoricalUpcomingClasses(
  studioId: string | undefined,
  allowedStudioIds: number[] | undefined,
  targetSnapshotDate: string,
  eventAfterDate: string,
  eventEndDate: string
) {
  let snapshotDateQuery = supabase
    .from("pts_upcoming_class_snapshots")
    .select("snapshot_date")
    .lte("snapshot_date", targetSnapshotDate)
    .order("snapshot_date", { ascending: false })
    .limit(1)
  if (studioId && studioId !== "all") snapshotDateQuery = snapshotDateQuery.eq("studio_id", studioId)
  else if (allowedStudioIds) snapshotDateQuery = snapshotDateQuery.in("studio_id", allowedStudioIds)
  const snapshotResult = await snapshotDateQuery.maybeSingle()
  if (snapshotResult.error) throw snapshotResult.error
  const snapshotDate = snapshotResult.data?.snapshot_date ?? null
  if (!snapshotDate) return { snapshotDate: null, rows: [] }

  let rowsQuery = supabase
    .from("pts_upcoming_class_snapshots_reporting")
    .select("studio_id,event_date,reporting_class_type,class_sales,fee_sales,seats_sold")
    .eq("snapshot_date", snapshotDate)
    .gt("event_date", eventAfterDate)
    .lte("event_date", eventEndDate)
    .range(0, 4999)
  if (studioId && studioId !== "all") rowsQuery = rowsQuery.eq("studio_id", studioId)
  else if (allowedStudioIds) rowsQuery = rowsQuery.in("studio_id", allowedStudioIds)
  const rowsResult = await rowsQuery
  if (rowsResult.error) throw rowsResult.error
  return { snapshotDate, rows: rowsResult.data ?? [] }
}

function easternToday() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export async function getExecutiveDashboard(
  studioId?: string,
  startDate?: string,
  endDate?: string,
  comparisonMode: "previous" | "priorYearWeek" | "custom" = "previous",
  customComparisonStart?: string,
  customComparisonEnd?: string,
  allowedStudioIds?: number[],
  weekComparisonStartDate?: string,
  weekComparisonEndDate?: string
): Promise<ExecutiveDashboardData> {
  const operations = await getOperationsDashboardWithComparison(
    studioId,
    startDate,
    endDate,
    comparisonMode,
    customComparisonStart,
    customComparisonEnd,
    allowedStudioIds
  )
  const comparisonPeriod = operations.comparison?.period ?? {
    startDate: operations.period.startDate,
    endDate: operations.period.endDate,
  }

  const today = easternToday()
  const todayDate = new Date(`${today}T00:00:00Z`)
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7
  const weekStart = shiftIsoDate(today, -mondayOffset)
  const weekEnd = shiftIsoDate(weekStart, 6)
  const yesterday = shiftIsoDate(today, -1)
  const hasCompletedWeekDays = yesterday >= weekStart
  const lastCompletedSunday = shiftIsoDate(weekStart, -1)
  const trendStart = shiftIsoDate(lastCompletedSunday, -55)
  const weekCompareStart = weekComparisonStartDate ?? shiftIsoDate(weekStart, -7)
  const weekCompareEnd = weekComparisonEndDate ?? shiftIsoDate(weekEnd, -7)
  const completedDayOffset = hasCompletedWeekDays
    ? Math.max(0, Math.round((new Date(`${yesterday}T00:00:00Z`).getTime() - new Date(`${weekStart}T00:00:00Z`).getTime()) / 86_400_000))
    : 0
  const unclampedCompareThrough = shiftIsoDate(weekCompareStart, completedDayOffset)
  const weekCompareThrough = unclampedCompareThrough > weekCompareEnd ? weekCompareEnd : unclampedCompareThrough

  const [marketing, marketingComparison, upcoming, completedWeek, trendOperations, completedComparisonWeek, historicalUpcoming] = await Promise.all([
    getMarketingDashboard(studioId, operations.period.startDate, operations.period.endDate, allowedStudioIds),
    getMarketingDashboard(
      studioId,
      comparisonPeriod.startDate,
      comparisonPeriod.endDate,
      allowedStudioIds
    ),
    getUpcomingClasses(studioId, allowedStudioIds),
    hasCompletedWeekDays
      ? getOperationsDashboard(studioId, weekStart, yesterday, allowedStudioIds)
      : Promise.resolve(null),
    getOperationsDashboard(studioId, trendStart, lastCompletedSunday, allowedStudioIds),
    getOperationsDashboard(studioId, weekCompareStart, weekCompareThrough, allowedStudioIds),
    getHistoricalUpcomingClasses(studioId, allowedStudioIds, weekCompareThrough, weekCompareThrough, weekCompareEnd),
  ])

  const remainingWeekClasses = upcoming.studios
    .flatMap((studio) => studio.classes)
    .filter((classItem) => classItem.eventDate >= today && classItem.eventDate <= weekEnd)
  const weeklySales = Array.from({ length: 8 }, (_, index) => {
    const startDate = shiftIsoDate(trendStart, index * 7)
    const endDate = shiftIsoDate(startDate, 6)
    const days = trendOperations.daily.filter(
      (day) => day.date >= startDate && day.date <= endDate
    )
    return {
      startDate,
      endDate,
      sales: days.reduce((sum, day) => sum + day.totalSales, 0),
      seats: days.reduce((sum, day) => sum + day.seatsSold, 0),
      studios: trendOperations.studioSales.map((studio) => ({
        studioId: studio.studioId,
        studioName: studio.studioName,
        sales: studio.daily
          .filter((day) => day.date >= startDate && day.date <= endDate)
          .reduce((sum, day) => sum + day.totalSales, 0),
      })),
    }
  })
  const completedPrivateParties =
    completedWeek?.classTypes.find((row) => row.name === "Private Party")?.events ?? 0
  const completedMobileEvents =
    completedWeek?.classTypes.find((row) => row.name === "Mobile Events")?.events ?? 0
  const comparisonFuture = historicalUpcoming.rows
  const comparisonCompletedPrivate = completedComparisonWeek.classTypes.find((row) => row.name === "Private Party")?.events ?? 0
  const comparisonCompletedMobile = completedComparisonWeek.classTypes.find((row) => row.name === "Mobile Events")?.events ?? 0

  return {
    period: operations.period,
    comparison: operations.comparison,
    operations,
    marketing,
    marketingComparison,
    thisWeek: {
      startDate: weekStart,
      endDate: weekEnd,
      completedThrough: hasCompletedWeekDays ? yesterday : null,
      salesWeekToDate: completedWeek?.kpis.totalSales ?? 0,
      seatsWeekToDate: completedWeek?.kpis.seatsSold ?? 0,
      futureBookedRevenue: remainingWeekClasses.reduce(
        (sum, classItem) => sum + classItem.revenue,
        0
      ),
      futureBookedSeats: remainingWeekClasses.reduce(
        (sum, classItem) => sum + classItem.seatsSold,
        0
      ),
      futureClasses: remainingWeekClasses.length,
      privateParties:
        completedPrivateParties +
        remainingWeekClasses.filter(
          (classItem) => classItem.classType === "Private Party"
        ).length,
      mobileEvents:
        completedMobileEvents +
        remainingWeekClasses.filter(
          (classItem) => classItem.classType === "Mobile Events"
        ).length,
    },
    thisWeekComparison: {
      startDate: weekCompareStart,
      endDate: weekCompareEnd,
      completedThrough: weekCompareThrough,
      snapshotDate: historicalUpcoming.snapshotDate,
      salesWeekToDate: completedComparisonWeek.kpis.totalSales,
      seatsWeekToDate: completedComparisonWeek.kpis.seatsSold,
      futureBookedRevenue: historicalUpcoming.snapshotDate
        ? comparisonFuture.reduce((sum, row) => sum + numberValue(row.class_sales) + numberValue(row.fee_sales), 0)
        : null,
      futureBookedSeats: historicalUpcoming.snapshotDate
        ? comparisonFuture.reduce((sum, row) => sum + numberValue(row.seats_sold), 0)
        : null,
      futureClasses: historicalUpcoming.snapshotDate ? comparisonFuture.length : null,
      privateParties: historicalUpcoming.snapshotDate
        ? comparisonCompletedPrivate + comparisonFuture.filter((row) => row.reporting_class_type === "Private Party").length
        : null,
      mobileEvents: historicalUpcoming.snapshotDate
        ? comparisonCompletedMobile + comparisonFuture.filter((row) => row.reporting_class_type === "Mobile Events").length
        : null,
    },
    weeklySales,
  }
}
