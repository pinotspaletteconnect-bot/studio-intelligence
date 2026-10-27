import "server-only"
import { assertStudioAccess } from "@/lib/auth/api"
import { supabase } from "@/lib/supabase/server"
import { businessDate, offsetDate, resolveReportPeriod } from "@/lib/date-range"
import { fetchAllRows } from "@/lib/supabase/pagination"
import { hasHistoricalPartyEvidence, isReportablePtsClass } from "@/lib/services/pts-class-filters"

export type PartySalesRow = {
  studio_id: number
  date: string
  events: number
  seats: number
  revenue: number
}

type DailyRow = {
  studio_id: number; report_date: string; class_event_count: number | string | null
  seats_sold: number | string | null; class_sales: number | string | null; fee_sales: number | string | null
}
type EventRow = {
  id: number; studio_id: number; event_date: string; seats_sold: number | string | null
  class_sales: number | string | null; fee_sales: number | string | null
  painting?: string | null; class_time?: string | null; capacity?: number | string | null
}

const numberValue = (value: number | string | null) => {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) throw new Error("Invalid private-party sales amount")
  return parsed
}

/** Current event detail replaces range-load history only for matching studio/dates. */
export function reconcilePartySales(current: EventRow[], historical: DailyRow[], timeZones = new Map<number, string | null>()): PartySalesRow[] {
  const daily = new Map<string, PartySalesRow>()
  for (const row of current) {
    if (!isReportablePtsClass(row, timeZones.get(row.studio_id)) ||
        !hasHistoricalPartyEvidence({ ...row, reporting_class_type: "Private Party" })) continue
    const key = `${row.studio_id}:${row.event_date}`
    const value = daily.get(key) ?? { studio_id: row.studio_id, date: row.event_date, events: 0, seats: 0, revenue: 0 }
    value.events += 1
    value.seats += numberValue(row.seats_sold)
    value.revenue += numberValue(row.class_sales) + numberValue(row.fee_sales)
    daily.set(key, value)
  }
  // Even a date containing only excluded placeholders has current detail coverage.
  // Do not reintroduce those classes through an older daily aggregate.
  const currentKeys = new Set(current.map(row => `${row.studio_id}:${row.event_date}`))
  for (const row of historical) {
    const key = `${row.studio_id}:${row.report_date}`
    if (currentKeys.has(key)) continue
    const value = daily.get(key) ?? { studio_id: row.studio_id, date: row.report_date, events: 0, seats: 0, revenue: 0 }
    value.events += numberValue(row.class_event_count)
    value.seats += numberValue(row.seats_sold)
    value.revenue += numberValue(row.class_sales) + numberValue(row.fee_sales)
    daily.set(key, value)
  }
  return [...daily.values()].sort((a, b) => a.date.localeCompare(b.date) || a.studio_id - b.studio_id)
}

function summarize(rows: PartySalesRow[]) {
  const events = rows.reduce((sum, row) => sum + row.events, 0)
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  return { events, revenue, seats: rows.reduce((sum, row) => sum + row.seats, 0), averageValue: events ? revenue / events : null }
}

export type PrivatePartyLead = {
  studio_id: number; source_lead_id: number; received_date: string
  source_stage: string; stage: string; converted: boolean; estimated_value: number | string | null
}

export function summarizePartyLeads(rows: PrivatePartyLead[]) {
  const converted=rows.filter(row=>row.converted)
  const valued=converted.filter(row=>row.estimated_value!==null)
  const stages=Object.fromEntries(['new','deposit_requested','booked','completed','lost','unknown'].map(stage=>[stage,rows.filter(row=>row.stage===stage).length]))
  return { received:rows.length, converted:converted.length, conversionRate:rows.length?converted.length/rows.length*100:null,
    stages, estimatedBookedValue:valued.reduce((sum,row)=>sum+numberValue(row.estimated_value),0),
    valuedBookings:valued.length, unvaluedBookings:converted.length-valued.length }
}

export async function getPrivateParties(studioId: string, start: string, end: string, allowedStudioIds: number[] = []) {
  const { periodStart, periodEnd } = resolveReportPeriod(start, end)
  assertStudioAccess({ allowedStudioIds }, studioId)
  const selectedIds = studioId === "all" ? allowedStudioIds : [Number(studioId)]
  const client = supabase
  const completedThrough = offsetDate(businessDate(), -1)
  const salesEnd = periodEnd < completedThrough ? periodEnd : completedThrough
  const scope = <T>(query: T): T =>
    (query as T & { in: (field: string, values: number[]) => T }).in("studio_id", selectedIds)
  const [current, historical, studiosResult, leadResult, coverageResult] = await Promise.all([
    fetchAllRows(scope(client.from("pts_class_sales_reporting")
      .select("id,studio_id,event_date,painting,class_time,capacity,seats_sold,class_sales,fee_sales")
      .eq("reporting_class_type", "Private Party").gte("event_date", periodStart).lte("event_date", salesEnd))
      .order("event_date").order("studio_id").order("id")),
    fetchAllRows(scope(client.from("pts_class_type_sales_daily_reporting")
      .select("studio_id,report_date,source_class_type,class_event_count,seats_sold,class_sales,fee_sales")
      .eq("reporting_class_type", "Private Party").gte("report_date", periodStart).lte("report_date", salesEnd))
      .order("report_date").order("studio_id").order("source_class_type")),
    fetchAllRows(client.from("studios").select("id,studio_name,timezone").in("id", selectedIds).order("id")),
    fetchAllRows(client.from("pts_private_party_leads_reporting")
      .select("studio_id,source_lead_id,received_date,source_stage,stage,converted,estimated_value")
      .in("studio_id", selectedIds).gte("received_date",periodStart).lte("received_date",periodEnd).order("studio_id").order("source_lead_id")),
    fetchAllRows(client.from("pts_private_party_history_coverage")
      .select("studio_id,source_count,loaded_count,source_first_date,source_last_date,completed_at,transition_history_available,history_from,unknown_date_count")
      .in("studio_id", selectedIds).order("studio_id")),
  ])
  for (const result of [current, historical, studiosResult]) if (result.error) throw result.error
  for(const result of [leadResult,coverageResult])if(result.error)throw result.error
  const leadRows=(leadResult.data??[]) as PrivatePartyLead[]
  const coverage=coverageResult.data??[]
  const coveredIds=new Set(coverage.map(row=>Number(row.studio_id)))
  const allStudiosCovered=(studiosResult.data??[]).every(studio=>coveredIds.has(Number(studio.id))) && coverage.every(row=>row.history_from && periodStart>=String(row.history_from))
  const leadSummary=summarizePartyLeads(leadRows.filter(row=>coveredIds.has(row.studio_id)))
  const timeZones = new Map((studiosResult.data ?? []).map(studio => [Number(studio.id), studio.timezone as string | null]))
  const rows = reconcilePartySales((current.data ?? []) as EventRow[], (historical.data ?? []) as DailyRow[], timeZones)
  const studios = (studiosResult.data ?? []).map((studio) => {
    const ownRows = rows.filter((row) => row.studio_id === studio.id)
    return { id: studio.id as number, name: studio.studio_name as string, hasSales: ownRows.length > 0, ...summarize(ownRows),
      leads:coveredIds.has(Number(studio.id))?summarizePartyLeads(leadRows.filter(row=>row.studio_id===studio.id)):null }
  })
  const monthly = new Map<string, PartySalesRow[]>()
  for (const row of rows) {
    const month = row.date.slice(0, 7)
    monthly.set(month, [...(monthly.get(month) ?? []), row])
  }
  return {
    period: { startDate: periodStart, endDate: periodEnd, salesThrough: salesEnd },
    leads: { status: allStudiosCovered?"complete" as const:coverage.length?"partial" as const:"pending" as const,
      summary:allStudiosCovered?leadSummary:null, coverage,
      unknownDateCount:coverage.reduce((sum,row)=>sum+Number(row.unknown_date_count??0),0),
      monthly:allStudiosCovered?[...new Set(leadRows.map(row=>row.received_date.slice(0,7)))].sort().map(month=>({month,...summarizePartyLeads(leadRows.filter(row=>row.received_date.startsWith(month)))})):[],
      studiosCovered:coveredIds.size, studiosRequested:(studiosResult.data??[]).length },
    sales: { hasSales: rows.length > 0, ...summarize(rows) },
    studios,
    monthly: [...monthly].map(([month, values]) => ({ month, ...summarize(values) })),
    coverage: { firstDate: rows.at(0)?.date ?? null, lastDate: rows.at(-1)?.date ?? null },
  }
}

export type PrivatePartiesData = Awaited<ReturnType<typeof getPrivateParties>>
