import { getMarketingDashboard, type MarketingDashboard } from "@/lib/services/marketing"
import {
  getOperationsDashboard,
  getOperationsDashboardWithComparison,
  type OperationsDashboardData,
} from "@/lib/services/operations"
import { getUpcomingClasses } from "@/lib/services/upcoming-classes"

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
  allowedStudioIds?: number[]
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

  const [marketing, marketingComparison, upcoming, completedWeek, trendOperations] = await Promise.all([
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
    weeklySales,
  }
}
