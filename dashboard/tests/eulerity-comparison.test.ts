import { describe, expect, it } from "vitest"
import { buildEulerityComparison, type EulerityComparisonRow } from "@/lib/services/eulerity-comparison"

const studios = [1, 2, 3, 4].map((id) => ({ id, studio_name: `Studio ${id}` }))
const row = (id: number, spend: number | null, clicks: number, date = "2026-09-01"): EulerityComparisonRow => ({
  studio_id: id, report_date: date, spend_social: spend, clicks_social: clicks, impressions_social: 1000,
  spend_total: spend, clicks_total: clicks, impressions_total: 1000,
})
describe("Eulerity studio comparison", () => {
  it("uses period revenue divided by period spend and keeps missing attribution distinct from zero", () => {
    const result = buildEulerityComparison(studios, [row(1, 25, 10), row(1, 75, 10, "2026-09-02"), row(2, 0, 0), row(3, 50, 10)], 2, [
      { studio_id: 1, report_date: "2026-09-01", total_revenue: 150 },
      { studio_id: 1, report_date: "2026-09-02", total_revenue: "50" },
      { studio_id: 2, report_date: "2026-09-01", total_revenue: 0 },
      { studio_id: 3, report_date: "2026-09-01", total_revenue: 100 },
    ])
    expect(result.studios[0].total.attributedRevenue).toBe(200)
    expect(result.studios[0].total.attributedRoas).toBe(2)
    expect(result.studios[1].total.attributedRevenue).toBe(0)
    expect(result.studios[1].total.attributedRoas).toBeNull()
    expect(result.studios[2].total.attributedRoas).toBeNull()
    expect(result.studios[3].total.attributedRevenue).toBeNull()
  })
  it("weights peer CPC by clicks and excludes the current studio", () => {
    const result = buildEulerityComparison(studios, [row(1, 100, 100), row(2, 20, 100), row(3, 180, 300)], 1)
    expect(result.studios[0].channels[0].peerCpc).toBe(0.5)
    expect(result.studios[0].channels[0].difference).toBe(100)
    expect(result.studios[3].total.spend).toBeNull()
  })
  it("does not compare incomplete periods or treat null spend as free clicks", () => {
    const result = buildEulerityComparison(studios, [row(1, 50, 100), row(1, 50, 100, "2026-09-02"), row(2, 20, 100), row(3, null, 100)], 2)
    expect(result.studios[0].channels[0].difference).toBeNull()
    expect(result.studios[2].channels[0].cpc).toBeNull()
  })
  it("keeps zero-click CPC undefined and calculates rates from period totals", () => {
    const result = buildEulerityComparison(studios, [row(1, 20, 0), row(2, 10, 10), row(2, 90, 30, "2026-09-02")], 2)
    expect(result.studios[0].channels[0].cpc).toBeNull()
    expect(result.studios[1].channels[0].cpc).toBe(2.5)
    expect(result.studios[1].channels[0].ctr).toBe(2)
  })
})
