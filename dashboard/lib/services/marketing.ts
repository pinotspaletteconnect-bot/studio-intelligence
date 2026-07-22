import { supabase } from "@/lib/supabase/server"

export async function getMarketingDashboard(
  studioId?: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from("marketing_daily_summary")
    .select("*")

  if (studioId && studioId !== "all") {
    query = query.eq("studio_id", studioId)
  }

  if (startDate) {
    query = query.gte("report_date", startDate)
  }

  if (endDate) {
    query = query.lte("report_date", endDate)
  }

  const { data, error } = await query.order("report_date")

console.log("studioId:", studioId)
console.log("error:", error)
console.log("rows:", data?.length)

if (error) {
  throw error
}

  if (!data) {
    return {
      kpis: {},
      trends: []
    }
  }

  // KPI Totals
  const kpis = {
    sessions: data.reduce((sum, row) => sum + (row.sessions ?? 0), 0),
    users: data.reduce((sum, row) => sum + (row.total_users ?? 0), 0),
    paidSpend: data.reduce((sum, row) => sum + Number(row.paid_spend ?? 0), 0),
    paidClicks: data.reduce((sum, row) => sum + (row.paid_clicks ?? 0), 0),

    engagementRate:
      data.length === 0
        ? 0
        : data.reduce(
            (sum, row) => sum + Number(row.engagement_rate ?? 0),
            0
          ) / data.length
  }

  // Trend Data
  const trends = data.map((row) => ({
    date: row.report_date,
    sessions: row.sessions,
    users: row.total_users,
    spend: Number(row.paid_spend),
    clicks: row.paid_clicks
  }))

  return {
    kpis,
    trends
  }
}