import { getReportingClient } from "@/lib/auth/access"
import { resolveReportPeriod } from "@/lib/date-range"
import { fetchAllRows } from "@/lib/supabase/pagination"
import { buildEulerityComparison, type EulerityComparisonRow } from "./eulerity-comparison"

// Use the explicit row contract below instead of expanding the SDK's recursive
// select-string types for this wide report.
const metricColumns: string = "studio_id,report_date,spend_total,clicks_total,impressions_total,spend_social,spend_search,spend_display,spend_video,spend_other,clicks_social,clicks_search,clicks_display,clicks_video,clicks_other,impressions_social,impressions_search,impressions_display,impressions_video,impressions_other"

export async function getEulerityComparison(start?: string, end?: string) {
  const { periodStart, periodEnd } = resolveReportPeriod(start, end)
  const client = await getReportingClient("all")
  const [studios, metrics] = await Promise.all([
    fetchAllRows(client.from("studios").select("id,studio_name").eq("active", true).order("studio_name").order("id")),
    fetchAllRows(client.from("eulerity_daily_metrics")
      .select(metricColumns)
      .gte("report_date", periodStart).lte("report_date", periodEnd).order("report_date").order("studio_id")),
  ])
  if (studios.error || metrics.error) throw studios.error ?? metrics.error
  const days = Math.round((Date.parse(periodEnd) - Date.parse(periodStart)) / 86400000) + 1
  return buildEulerityComparison(studios.data ?? [], (metrics.data ?? []) as unknown as EulerityComparisonRow[], days)
}
