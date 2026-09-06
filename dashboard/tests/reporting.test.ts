import { beforeEach, describe, expect, it, vi } from "vitest"
import { getMarketingDashboard } from "@/lib/services/marketing"
import { getOperationsDashboard, getDailyOperatingDetail, getClassEventSalesDetail, getCandleSalesDetail } from "@/lib/services/operations"
import { getUpcomingClasses } from "@/lib/services/upcoming-classes"
import { warehouse, type Row } from "./warehouse"

const state = vi.hoisted(() => ({ client: null as unknown, ids: [1] }))
vi.mock("@/lib/supabase/server", () => ({ get supabase() { return state.client } }))
vi.mock("@/lib/auth/session", () => ({ getUserAccessContext: vi.fn() }))
const date = "2026-08-01"
function useWarehouse(tables: Record<string, Row[]>, ids = [1]) {
  const db = warehouse({ studios: [{ id: 1, studio_name: "Studio One", active: true }, { id: 2, studio_name: "Studio Two", active: true }], ...tables })
  state.client = db.client
  state.ids = ids
  return db
}
beforeEach(() => vi.useRealTimers())

describe("marketing totals", () => {
  it("includes more than 1,000 attribution rows and reuses Eulerity data", async () => {
    const db = useWarehouse({
      ga4_source_medium_performance: Array.from({ length: 1505 }, (_, id) => ({ studio_id: 1, report_date: date, source: `source-${id}`, medium: "cpc", vendor: "Meta", marketing_type: "Paid", sessions: 1, total_revenue: 2 })),
      eulerity_daily_metrics: [{ studio_id: 1, report_date: date, spend_total: 12, clicks_total: 3, impressions_total: 100, spend_social: 12, clicks_social: 3, impressions_social: 100 }],
      meta_ads_daily: [{ studio_id: 1, integration_date: date, date_start: date, account_id: "a", campaign_id: "b", spend: 8, clicks: 2, impressions: 20 }],
    })
    const result = await getMarketingDashboard("all", date, date, state.ids)
    expect(result.kpis.attributedRevenue).toBe(3010)
    expect(result.kpis.paidSpend).toBe(20)
    expect(result.kpis.paidCpc).toBe(4)
    expect(result.eulerityChannels.find((row) => row.key === "social")?.spend).toBe(12)
    expect(result.trends).toHaveLength(1) // retain paid-only dates with no GA4 row
    expect(db.requests.filter((url) => url.pathname.endsWith("/eulerity_daily_metrics") && url.searchParams.get("offset") === "0")).toHaveLength(1)
  })
  it("keeps Meta's two different date contracts intact", async () => {
    useWarehouse({ meta_ads_daily: [{ studio_id: 1, integration_date: "2026-08-02", date_start: date, account_id: "a", campaign_id: "b", spend: 9 }] })
    const result = await getMarketingDashboard("all", date, date, state.ids)
    expect(result.kpis.paidSpend).toBe(0)
    expect(result.metaCampaigns[0].spend).toBe(9)
  })
  it("does not turn a failed source into zero revenue", async () => {
    const db = useWarehouse({})
    db.failures.set("ga4_source_medium_performance", { code: "57014", message: "query cancelled" })
    await expect(getMarketingDashboard("all", date, date, state.ids)).rejects.toMatchObject({ code: "57014" })
  })
})

describe("operations reconciliation", () => {
  it("prefers current facts on overlap and preserves history for other studios", async () => {
    useWarehouse({
      pts_operations_daily: [{ studio_id: 1, report_date: date, total_sales: 500 }, { studio_id: 2, report_date: date, total_sales: 40 }],
      pts_daily_operations_reporting: [{ studio_id: 1, report_date: date, class_reported_net_sales: 100, class_reported_seats_sold: 4 }],
      pts_product_sales_daily_reporting: [{ id: 1, studio_id: 1, report_date: date, department: "Food & Beverage", net_sales: 900 }, { id: 2, studio_id: 2, report_date: date, department: "Food & Beverage", net_sales: 7 }],
      pts_product_sales_reporting: [{ id: 1, studio_id: 1, report_date: date, department: "Food & Beverage", item_name: "Wine", net_sales: 12, quantity: 2 }, { id: 2, studio_id: 1, report_date: date, department: "Food & Beverage", item_name: "Preorder", net_sales: 0, quantity: 99 }],
    }, [1, 2])
    const result = await getOperationsDashboard("all", date, date, state.ids)
    expect(result.kpis.totalSales).toBe(140)
    expect(result.foodBeverage.reduce((sum, row) => sum + row.sales, 0)).toBe(19)
    expect(result.foodBeverage.reduce((sum, row) => sum + row.quantity, 0)).toBe(2)
  })
  it("includes all classes in summary and drill-down totals", async () => {
    const classes = Array.from({ length: 1205 }, (_, id) => ({ id, studio_id: 1, event_date: date, class_time: `${date}T18:00:00`, reporting_class_type: "Private Party", seats_sold: 2, capacity: 4, class_sales: 10, net_sales: 10, lead_time_average: 5 }))
    const db = useWarehouse({ pts_class_sales_reporting: classes })
    const summary = await getOperationsDashboard("all", date, date, state.ids)
    expect(summary.kpis.privatePartyEvents).toBe(1205)
    expect(summary.kpis.averageLeadTime).toBe(5)
    expect(db.requests.filter((url) => url.pathname.endsWith("/pts_class_sales_reporting") && url.searchParams.get("offset") === "0")).toHaveLength(1)
    expect((await getDailyOperatingDetail(undefined, date, state.ids)).totals.classes).toBe(1205)
    expect((await getClassEventSalesDetail("Private Party", undefined, date, date, state.ids)).totals.revenue).toBe(12050)
  })
  it("paginates upcoming classes and keeps missing booking data unknown", async () => {
    useWarehouse({ pts_upcoming_classes_current: Array.from({ length: 1101 }, (_, id) => ({ studio_id: 1, source_event_key: String(id), event_date: date, snapshot_date: date, seats_sold: 2, capacity: 4, class_sales: 10 })) })
    const result = await getUpcomingClasses("all", state.ids)
    expect(result.kpis.upcomingClasses).toBe(1101)
    expect(result.kpis.seatsSold).toBe(2202)
    expect(result.kpis.bookedSeats).toBeNull()
  })
})

it("filters portfolio results and rejects direct requests for another studio across services", async () => {
  useWarehouse({ eulerity_daily_metrics: [{ studio_id: 1, report_date: date, spend_total: 10 }, { studio_id: 2, report_date: date, spend_total: 900 }] })
  expect((await getMarketingDashboard("all", date, date, state.ids)).kpis.paidSpend).toBe(10)
  for (const call of [
    () => getMarketingDashboard("2", date, date, state.ids), () => getOperationsDashboard("2", date, date, state.ids),
    () => getUpcomingClasses("2", state.ids), () => getDailyOperatingDetail(2, date, state.ids),
    () => getClassEventSalesDetail("Private Party", 2, date, date, state.ids), () => getCandleSalesDetail(2, date, date, state.ids),
  ]) await expect(call()).rejects.toMatchObject({ status: 403 })
})
