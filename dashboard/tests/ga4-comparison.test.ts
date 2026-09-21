import { describe, expect, it, vi } from "vitest"
import { getGa4NorthAmericaDashboard } from "@/lib/services/ga4-reporting"
import { warehouse, type Row } from "./warehouse"
const state = vi.hoisted(() => ({ client: null as unknown }))
vi.mock("@/lib/supabase/server", () => ({ get supabase() { return state.client } }))
const date = "2026-09-20"
const prior = "2026-09-19"
const daily = (studio_id: number, report_date: string, sessions: number, active_users = sessions) => ({ studio_id, report_date, sessions, active_users, engaged_sessions: sessions / 2, ecommerce_purchases: 2, purchase_revenue: sessions * 10 })
function setup(rows: Row[], keys: Row[] = []) {
  const db = warehouse({ studios: [1, 2, 3].map(id => ({ id, studio_name: `Studio ${id}`, active: true })), ga4_north_america_daily_metrics: rows, ga4_north_america_breakdown_daily: keys }, 2)
  state.client = db.client
  return db
}
describe("GA4 studio comparison", () => {
  it("separates studio metrics, uses each baseline, and paginates within authorized scope", async () => {
    setup([daily(1, date, 20), daily(1, prior, 10), daily(2, date, 40), daily(2, prior, 80), daily(3, date, 999)])
    const report = await getGa4NorthAmericaDashboard("all", date, date, [1, 2])
    expect(report.studios.map(s => s.id)).toEqual([1, 2])
    expect(report.studios[0].kpis.sessions).toEqual({ value: 20, previous: 10, delta: 10, change: 100 })
    expect(report.studios[1].kpis.sessions.change).toBe(-50)
    expect(report.kpis.sessions.value).toBe(60)
    const single = await getGa4NorthAmericaDashboard("2", date, date, [1, 2])
    expect(single.studios.map(s => s.id)).toEqual([2])
    await expect(getGa4NorthAmericaDashboard("3", date, date, [1, 2])).rejects.toThrow("access denied")
  })
  it("uses each custom period's own day count for daily averages", async () => {
    setup([daily(1, date, 20), daily(1, prior, 10), daily(1, "2026-09-18", 10)])
    const report = await getGa4NorthAmericaDashboard("all", date, date, [1], "custom", "2026-09-18", prior)
    expect(report.comparisonDays).toBe(2)
    expect(report.studios[0].kpis.activeUsers).toEqual({ value: 20, previous: 10, delta: 10, change: 100 })
    expect(report.kpis.activeUsers.change).toBe(100)
  })
  it("keeps missing periods and partial data unavailable instead of reporting declines", async () => {
    setup([daily(1, date, 20), daily(2, prior, 5)])
    const report = await getGa4NorthAmericaDashboard("all", date, date, [1, 2, 3])
    expect(report.studios[0].kpis.sessions).toEqual({ value: 20, previous: null, delta: null, change: null })
    expect(report.studios[1].kpis.sessions.value).toBeNull()
    expect(report.studios[2].currentDays).toBe(0)
    const partial = await getGa4NorthAmericaDashboard("all", prior, date, [1])
    expect(partial.studios[0].kpis.sessions.value).toBeNull()
  })
  it("shows absolute changes from zero but leaves undefined rates unavailable", async () => {
    setup([daily(1, date, 20), daily(1, prior, 0)])
    const report = await getGa4NorthAmericaDashboard("all", date, date, [1])
    expect(report.studios[0].kpis.sessions).toEqual({ value: 20, previous: 0, delta: 20, change: null })
    expect(report.studios[0].kpis.engagementRate.previous).toBeNull()
  })
  it("uses country key events, preserves zeroes, and respects prior-year dates", async () => {
    setup([daily(1, date, 20), daily(1, "2025-09-21", 10)], [
      { studio_id: 1, report_date: date, breakdown_type: "country", dimension_value: "US", key_events: 4 },
      { studio_id: 1, report_date: date, breakdown_type: "country", dimension_value: "Canada", key_events: 2 },
      { studio_id: 1, report_date: "2025-09-21", breakdown_type: "country", dimension_value: "US", key_events: 0 },
    ])
    const report = await getGa4NorthAmericaDashboard("all", date, date, [1], "priorYearWeek")
    expect(report.comparisonPeriod.startDate).toBe("2025-09-21")
    expect(report.studios[0].kpis.keyEvents).toEqual({ value: 6, previous: 0, delta: 6, change: null })
  })
})
