// Explicit opt-in; only SELECT requests, never source collection or warehouse writes.
import { expect, it } from "vitest"
import { fetchAllRows } from "@/lib/supabase/pagination"
import { getCompletedDateRange } from "@/lib/date-range"

it.skipIf(process.env.SI_VERIFY_LIVE !== "1")("reconciles production reporting with complete source reads", async () => {
  const { supabase } = await import("@/lib/supabase/server")
  const { getMarketingDashboard } = await import("@/lib/services/marketing")
  const { getOperationsDashboard } = await import("@/lib/services/operations")
  const { getUpcomingClasses } = await import("@/lib/services/upcoming-classes")
  const studios = await supabase.from("studios").select("id").eq("active", true)
  expect(studios.error).toBeNull()
  const ids = studios.data!.map(row => Number(row.id))
  for (const preset of ["30d", "90d"] as const) {
    const { startDate: start, endDate: end } = getCompletedDateRange(preset)
    const began = performance.now()
    const marketing = await getMarketingDashboard("all", start, end, ids)
    const operations = await getOperationsDashboard("all", start, end, ids)
    const source = supabase.from("ga4_source_medium_performance").select("studio_id,report_date,source,medium,total_revenue").in("studio_id", ids).gte("report_date", start).lte("report_date", end)
    const count = await supabase.from("ga4_source_medium_performance").select("studio_id", { count: "exact", head: true }).in("studio_id", ids).gte("report_date", start).lte("report_date", end)
    const rows = await fetchAllRows(source.order("report_date").order("studio_id").order("source").order("medium"))
    expect(rows.error).toBeNull()
    expect(count.error).toBeNull()
    expect(rows.data).toHaveLength(count.count!)
    const sources = await Promise.all([
      fetchAllRows(supabase.from("meta_ads_daily").select("spend").in("studio_id", ids).gte("integration_date", start).lte("integration_date", end).order("id")),
      fetchAllRows(supabase.from("eulerity_daily_metrics").select("spend_total").in("studio_id", ids).gte("report_date", start).lte("report_date", end).order("report_date").order("studio_id")),
      fetchAllRows(supabase.from("pts_operations_daily").select("studio_id,report_date,total_sales").in("studio_id", ids).gte("report_date", start).lte("report_date", end).order("report_date").order("studio_id")),
      fetchAllRows(supabase.from("pts_daily_operations_reporting").select("studio_id,report_date,total_sales:class_reported_net_sales").in("studio_id", ids).gte("report_date", start).lte("report_date", end).order("report_date").order("studio_id")),
    ])
    for (const source of sources) expect(source.error).toBeNull()
    const spend = (sources[0].data ?? []).reduce((sum, row) => sum + Number(row.spend ?? 0), 0) + (sources[1].data ?? []).reduce((sum, row) => sum + Number(row.spend_total ?? 0), 0)
    const daily = new Map([...sources[2].data!, ...sources[3].data!].map(row => [`${row.studio_id}:${row.report_date}`, Number(row.total_sales ?? 0)]))
    expect(marketing.kpis.paidSpend).toBeCloseTo(spend, 2)
    expect(operations.kpis.totalSales).toBeCloseTo([...daily.values()].reduce((sum, value) => sum + value, 0), 2)
    console.log(JSON.stringify({ start, end, attributionRows: count.count, marketingSpend: marketing.kpis.paidSpend, operationsSales: operations.kpis.totalSales, elapsedMs: Math.round(performance.now() - began) }))
  }
  const upcoming = await getUpcomingClasses("all", ids)
  expect(upcoming.studios.every(studio => ids.includes(studio.id))).toBe(true)
}, 120_000)
