import { describe, expect, it, vi } from "vitest"
import { getEulerityComparison } from "@/lib/services/eulerity"
import { warehouse } from "./warehouse"

const state = vi.hoisted(() => ({ client: null as unknown }))
vi.mock("@/lib/supabase/server", () => ({ get supabase() { return state.client } }))

describe("Eulerity reporting scope", () => {
  it("only includes authorized studios and paginates all their records", async () => {
    const db = warehouse({
      studios: [{ id: 1, studio_name: "Allowed", active: true }, { id: 2, studio_name: "Private", active: true }],
      eulerity_daily_metrics: [
        { studio_id: 1, report_date: "2026-09-01", spend_total: 10 },
        { studio_id: 1, report_date: "2026-09-02", spend_total: 20 },
        { studio_id: 2, report_date: "2026-09-01", spend_total: 999 },
      ],
      ga4_source_medium_performance: [
        { studio_id: 1, report_date: "2026-09-01", vendor: "Eulerity", marketing_type: "Paid", total_revenue: 60 },
        { studio_id: 1, report_date: "2026-09-02", vendor: "Eulerity", marketing_type: "Paid", total_revenue: 30 },
        { studio_id: 2, report_date: "2026-09-01", vendor: "Eulerity", marketing_type: "Paid", total_revenue: 999 },
        { studio_id: 1, report_date: "2026-09-01", vendor: "Meta", marketing_type: "Paid", total_revenue: 999 },
        { studio_id: 1, report_date: "2026-09-01", vendor: "Eulerity", marketing_type: "Organic", total_revenue: 999 },
        { studio_id: 1, report_date: "2026-08-01", vendor: "Eulerity", marketing_type: "Paid", total_revenue: 999 },
      ],
    }, 1)
    state.client = db.client
    const result = await getEulerityComparison("2026-09-01", "2026-09-02", [1])
    expect(result.studios).toHaveLength(1)
    expect(result.studios[0].total.spend).toBe(30)
    expect(result.studios[0].daysWithData).toBe(2)
    expect(result.studios[0].total.attributedRevenue).toBe(90)
    expect(result.studios[0].total.attributedRoas).toBe(3)
    expect(db.requests.every((url) => url.searchParams.has(url.pathname.endsWith("/studios") ? "id" : "studio_id"))).toBe(true)
  })
  it("defaults to no access and makes no warehouse requests", async () => {
    const db = warehouse({})
    state.client = db.client
    expect((await getEulerityComparison("2026-09-01", "2026-09-01")).studios).toEqual([])
    expect(db.requests).toHaveLength(0)
  })
  it("rejects incomplete reads instead of displaying partial totals", async () => {
    const db = warehouse({})
    state.client = db.client
    db.failures.set("eulerity_daily_metrics", { code: "57014", message: "query cancelled" })
    await expect(getEulerityComparison("2026-09-01", "2026-09-01", [1])).rejects.toMatchObject({ code: "57014" })
  })
})
