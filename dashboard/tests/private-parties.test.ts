import { beforeEach, describe, expect, it, vi } from "vitest"
import { getPrivateParties, summarizePartyLeads, previousYearDate, partyMetricChange } from "@/lib/services/private-parties"
import { warehouse, type Row } from "./warehouse"

const state = vi.hoisted(() => ({ client: null as unknown, ids: [1, 2] }))
vi.mock("@/lib/supabase/server", () => ({ get supabase() { return state.client } }))
vi.mock("@/lib/auth/session", () => ({ getUserAccessContext: vi.fn() }))
function useWarehouse(tables: Record<string, Row[]>, allowed = [1, 2]) {
  const db = warehouse({ studios: [{ id: 1, studio_name: "One" }, { id: 2, studio_name: "Two" }], ...tables })
  state.client = db.client
  state.ids = allowed
  return db
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T16:00:00Z")) })

describe("private-party history", () => {
  it("keeps all active pipeline stages independent of inquiry dates", async () => {
    useWarehouse({
      pts_private_party_history_coverage: [{ studio_id: 1, history_from: "2024-01-01" }],
      pts_private_party_leads_reporting: [
        { studio_id: 1, source_lead_id: 1, received_date: "2024-01-01", stage: "new" },
        { studio_id: 1, source_lead_id: 2, received_date: null, stage: "new" },
        { studio_id: 1, source_lead_id: 3, received_date: "2025-01-01", stage: "deposit_requested" },
        { studio_id: 1, source_lead_id: 4, received_date: null, stage: "booked" },
        { studio_id: 1, source_lead_id: 5, received_date: "2026-10-01", stage: "lost" },
        { studio_id: 2, source_lead_id: 6, received_date: null, stage: "new" },
      ],
    }, [1])
    const october = await getPrivateParties("all", "2026-10-01", "2026-10-26", state.ids)
    const history = await getPrivateParties("all", "2024-01-01", "2026-10-26", state.ids)
    expect(october.pipeline.summary).toEqual({ new: 2, deposit_requested: 1, booked: 1 })
    expect(history.pipeline.summary).toEqual(october.pipeline.summary)
    expect(october.leads.summary!.received).toBe(1)
    expect(history.leads.summary!.received).toBe(3)
  })
  it("excludes placeholder parties consistently with event detail without restoring older aggregates", async () => {
    useWarehouse({
      studios: [{ id: 1, studio_name: "One", timezone: "America/New_York" }],
      pts_class_sales_reporting: [
        { id: 1, studio_id: 1, event_date: "2026-10-01", painting: "Available for Private Party", class_sales: 0 },
        { id: 2, studio_id: 1, event_date: "2026-10-02", painting: "No Painting Selected", capacity: 200, seats_sold: 0, class_sales: 0 },
        { id: 3, studio_id: 1, event_date: "2026-10-03", painting: "Real party", class_time: "2026-10-03T06:00:00Z", class_sales: 50 },
        { id: 4, studio_id: 1, event_date: "2026-10-04", painting: "No Painting Selected", seats_sold: 4, class_sales: 200 },
        { id: 5, studio_id: 1, event_date: "2026-10-05", painting: "Coming Soon", capacity: 24, seats_sold: 0, class_sales: 0 },
        { id: 6, studio_id: 1, event_date: "2026-10-06", painting: "Spooky Trio", capacity: 800, seats_sold: 0, class_sales: 0 },
      ].map(row => ({ reporting_class_type: "Private Party", ...row })),
      pts_class_type_sales_daily_reporting: [
        { studio_id: 1, report_date: "2026-10-01", reporting_class_type: "Private Party", class_event_count: 1, class_sales: 99 },
      ],
    }, [1])
    const result = await getPrivateParties("all", "2026-10-01", "2026-10-26", state.ids)
    expect(result.sales).toMatchObject({ events: 1, revenue: 200, averageValue: 200 })
  })
  it("reconciles overlapping source histories by studio/date and weights average value", async () => {
    useWarehouse({
      pts_class_sales_reporting: [
        { id: 1, studio_id: 1, event_date: "2026-10-01", reporting_class_type: "Private Party", class_sales: 100, fee_sales: 10, seats_sold: 4 },
        { id: 2, studio_id: 1, event_date: "2026-10-01", reporting_class_type: "Private Party", class_sales: 200, fee_sales: 20, seats_sold: 5 },
        { id: 3, studio_id: 1, event_date: "2026-10-26", reporting_class_type: "Private Party", class_sales: 500 },
      ],
      pts_class_type_sales_daily_reporting: [
        { studio_id: 1, report_date: "2026-10-01", source_class_type: "Private Party", reporting_class_type: "Private Party", class_event_count: 100, class_sales: 9999 },
        { studio_id: 2, report_date: "2026-10-01", source_class_type: "Private Party", reporting_class_type: "Private Party", class_event_count: 1, class_sales: 300, fee_sales: 30, seats_sold: 8 },
        { studio_id: 1, report_date: "2026-09-01", source_class_type: "Private Party", reporting_class_type: "Private Party", class_event_count: 1, class_sales: 400, fee_sales: 40, seats_sold: 10 },
      ],
    })
    const result = await getPrivateParties("all", "2026-09-01", "2026-10-26", state.ids)
    expect(result.sales).toMatchObject({ events: 4, revenue: 1100, averageValue: 275, seats: 27 })
    expect(result.monthly.map((row) => row.revenue)).toEqual([440, 660])
    expect(result.period.salesThrough).toBe("2026-10-25")
    expect(result.leads.status).toBe("pending")
  })
  it("paginates party events without leaking another studio", async () => {
    useWarehouse({ pts_class_sales_reporting: [
      ...Array.from({ length: 1205 }, (_, id) => ({ id, studio_id: 1, event_date: "2026-10-01", reporting_class_type: "Private Party", class_sales: 2 })),
      { id: 5000, studio_id: 2, event_date: "2026-10-01", reporting_class_type: "Private Party", class_sales: 999 },
    ] }, [1])
    const result = await getPrivateParties("all", "2026-10-01", "2026-10-26", state.ids)
    expect(result.sales.events).toBe(1205)
    expect(result.sales.revenue).toBe(2410)
    expect(result.studios).toHaveLength(1)
    await expect(getPrivateParties("2", "2026-10-01", "2026-10-26", state.ids)).rejects.toMatchObject({ status: 403 })
  })
  it("keeps missing history distinct from zero-value parties", async () => {
    useWarehouse({ pts_class_sales_reporting: [{ id: 1, studio_id: 1, event_date: "2026-10-01", reporting_class_type: "Private Party", seats_sold: 2, class_sales: 0 }] })
    const result = await getPrivateParties("all", "2026-10-01", "2026-10-26", state.ids)
    expect(result.studios[0]).toMatchObject({ hasSales: true, averageValue: 0 })
    expect(result.studios[1]).toMatchObject({ hasSales: false, averageValue: null })
  })
  it("fails visibly when historical sales cannot be read", async () => {
    const db = useWarehouse({})
    db.failures.set("pts_class_type_sales_daily_reporting", { code: "57014", message: "cancelled" })
    await expect(getPrivateParties("all", "2026-10-01", "2026-10-26", state.ids)).rejects.toMatchObject({ code: "57014" })
  })
  it("keeps converted completed leads and missing quotes in the same inquiry cohort",()=>{
    const result=summarizePartyLeads([
      {studio_id:1,source_lead_id:1,received_date:"2026-10-01",source_stage:"Party Closed",stage:"completed",converted:true,estimated_value:200},
      {studio_id:1,source_lead_id:2,received_date:"2026-10-02",source_stage:"Manage Party",stage:"booked",converted:true,estimated_value:null},
      {studio_id:1,source_lead_id:3,received_date:"2026-10-03",source_stage:"Date Approved",stage:"deposit_requested",converted:false,estimated_value:800},
    ])
    expect(result.converted).toBe(2)
    expect(result.conversionRate).toBeCloseTo(200/3)
    expect(result.estimatedBookedValue).toBe(200)
    expect(result.unvaluedBookings).toBe(1)
  })
  it("withholds portfolio rates when any selected studio is not reconciled",async()=>{
    useWarehouse({pts_private_party_history_coverage:[{studio_id:1,history_from:"2024-01-01"}]})
    const result=await getPrivateParties("all","2026-10-01","2026-10-26", state.ids)
    expect(result.leads.status).toBe("partial")
    expect(result.leads.summary).toBeNull()
    expect(result.studios.find(s=>s.id===2)?.leads).toBeNull()
  })
  it("scopes lead cohorts and coverage to the authorized studios", async () => {
    useWarehouse({
      pts_private_party_history_coverage: [
        { studio_id: 1, history_from: "2024-01-01", unknown_date_count: 3 },
        { studio_id: 2, history_from: "2024-01-01", unknown_date_count: 99 },
      ],
      pts_private_party_leads_reporting: [
        { studio_id: 1, source_lead_id: 10, received_date: "2026-10-01", stage: "booked", converted: true, estimated_value: 100 },
        { studio_id: 2, source_lead_id: 20, received_date: "2026-10-01", stage: "booked", converted: true, estimated_value: 9000 },
      ],
    }, [1])
    const result = await getPrivateParties("all", "2026-10-01", "2026-10-26", state.ids)
    expect(result.leads.summary).toMatchObject({ received: 1, converted: 1, estimatedBookedValue: 100 })
    expect(result.leads.unknownDateCount).toBe(3)
    expect(result.leads.coverage.map(row => row.studio_id)).toEqual([1])
  })
})


describe("same-period year comparisons", () => {
  it("clamps leap days and handles missing and zero baselines", () => {
    expect(previousYearDate("2024-02-29", 1)).toBe("2023-02-28")
    expect(previousYearDate("2026-10-26", 2)).toBe("2024-10-26")
    expect(partyMetricChange(12, 10)).toEqual({ difference: 2, percent: 20 })
    expect(partyMetricChange(5, 0)).toEqual({ difference: 5, percent: null })
    expect(partyMetricChange(5, null)).toBeNull()
  })
  it("matches partial-month sales cutoff, inquiry cohorts and authorized studios", async () => {
    useWarehouse({
      pts_private_party_history_coverage: [{ studio_id: 1, history_from: "2024-01-01" }],
      pts_private_party_leads_reporting: [
        { studio_id: 1, source_lead_id: 1, received_date: "2026-09-01", converted: true, stage: "booked" },
        { studio_id: 1, source_lead_id: 2, received_date: "2026-10-01", converted: false, stage: "new" },
        { studio_id: 1, source_lead_id: 3, received_date: "2025-10-01", converted: true, stage: "completed" },
        { studio_id: 2, source_lead_id: 4, received_date: "2025-10-01", converted: true, stage: "completed" },
      ],
      pts_class_sales_reporting: [
        { id: 1, studio_id: 1, event_date: "2026-10-25", class_sales: 200 },
        { id: 2, studio_id: 1, event_date: "2025-10-25", class_sales: 100 },
        { id: 3, studio_id: 1, event_date: "2025-10-26", class_sales: 900 },
        { id: 4, studio_id: 2, event_date: "2025-10-25", class_sales: 9000 },
      ].map(row => ({ ...row, reporting_class_type: "Private Party" })),
    }, [1])
    const result = await getPrivateParties("all", "2026-10-01", "2026-10-26", [1])
    expect(result.leads.summary).toMatchObject({ received: 1, converted: 0 })
    expect(result.comparisons).toHaveLength(2)
    expect(result.comparisons[0]).toMatchObject({ period: { startDate: "2025-10-01", endDate: "2025-10-26", salesThrough: "2025-10-25" }, leads: { received: 1, converted: 1 }, sales: { events: 1, revenue: 100 }, changes: { revenue: { difference: 100, percent: 100 }, conversionPoints: -100 } })
    expect(result.comparisons[1].changes.parties).toBeNull()
    const oldest = await getPrivateParties("all", "2024-10-01", "2024-10-26", [1])
    expect(oldest.comparisons).toEqual([])
  })
})
