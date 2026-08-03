import { getMarketingDashboard, type MarketingDashboard } from "@/lib/services/marketing"
import {
  getOperationsDashboardWithComparison,
  type OperationsDashboardData,
} from "@/lib/services/operations"

export type ExecutiveDashboardData = {
  period: OperationsDashboardData["period"]
  comparison: OperationsDashboardData["comparison"]
  operations: OperationsDashboardData
  marketing: MarketingDashboard
  marketingComparison: MarketingDashboard
}

export async function getExecutiveDashboard(
  studioId?: string,
  startDate?: string,
  endDate?: string,
  comparisonMode: "previous" | "priorYearWeek" | "custom" = "previous",
  customComparisonStart?: string,
  customComparisonEnd?: string
): Promise<ExecutiveDashboardData> {
  const operations = await getOperationsDashboardWithComparison(
    studioId,
    startDate,
    endDate,
    comparisonMode,
    customComparisonStart,
    customComparisonEnd
  )
  const comparisonPeriod = operations.comparison?.period ?? {
    startDate: operations.period.startDate,
    endDate: operations.period.endDate,
  }

  const [marketing, marketingComparison] = await Promise.all([
    getMarketingDashboard(studioId, operations.period.startDate, operations.period.endDate),
    getMarketingDashboard(
      studioId,
      comparisonPeriod.startDate,
      comparisonPeriod.endDate
    ),
  ])

  return {
    period: operations.period,
    comparison: operations.comparison,
    operations,
    marketing,
    marketingComparison,
  }
}
