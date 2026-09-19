import { supabase } from "@/lib/supabase/server"
import { resolveReportPeriod } from "@/lib/date-range"
import { fetchAllRows } from "@/lib/supabase/pagination"
import { buildEulerityComparison, type EulerityComparisonRow, type EulerityAttributionRow } from "./eulerity-comparison"

// Use the explicit row contract below instead of expanding the SDK's recursive
// select-string types for this wide report.
const metricColumns: string = "studio_id,report_date,spend_total,clicks_total,impressions_total,spend_social,spend_search,spend_display,spend_video,spend_other,clicks_social,clicks_search,clicks_display,clicks_video,clicks_other,impressions_social,impressions_search,impressions_display,impressions_video,impressions_other"

export async function getEulerityComparison(start?: string, end?: string, allowedStudioIds: number[] = []) {
  const { periodStart, periodEnd } = resolveReportPeriod(start, end)
  if (!allowedStudioIds.length) return buildEulerityComparison([], [], Math.round((Date.parse(periodEnd) - Date.parse(periodStart)) / 86400000) + 1)
  const client = supabase
  const [studios, metrics, attribution] = await Promise.all([
    fetchAllRows(client.from("studios").select("id,studio_name").in("id", allowedStudioIds).eq("active", true).order("studio_name").order("id")),
    fetchAllRows(client.from("eulerity_daily_metrics")
      .select(metricColumns)
      .in("studio_id", allowedStudioIds)
      .gte("report_date", periodStart).lte("report_date", periodEnd).order("report_date").order("studio_id")),
    fetchAllRows(client.from("ga4_source_medium_performance")
      .select("studio_id,report_date,total_revenue")
      .in("studio_id", allowedStudioIds).eq("vendor", "Eulerity").eq("marketing_type", "Paid")
      .gte("report_date", periodStart).lte("report_date", periodEnd)
      .order("report_date").order("studio_id").order("source").order("medium")),
  ])
  if (studios.error || metrics.error || attribution.error) throw studios.error ?? metrics.error ?? attribution.error
  const days = Math.round((Date.parse(periodEnd) - Date.parse(periodStart)) / 86400000) + 1
  return buildEulerityComparison(studios.data ?? [], (metrics.data ?? []) as unknown as EulerityComparisonRow[], days, (attribution.data ?? []) as EulerityAttributionRow[])
}
