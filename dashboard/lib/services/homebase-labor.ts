import "server-only"
import { supabase } from "@/lib/supabase/server"

type DailyRow = { studio_id: number; studio_name: string; labor_date: string; scheduled_hours: number | string | null; actual_hours: number | string | null; scheduled_cost: number | string | null; actual_cost: number | string | null; best_available_cost: number | string | null; cost_basis: string }
type ClassRow = { studio_id: number; source_event_key: string; event_date: string; class_time: string | null; painting: string | null; class_revenue: number | string | null; allocated_labor_cost: number | string | null; allocated_labor_hours: number | string | null; contributing_shifts: number | string | null; allocation_method: string }
const num = (value: unknown) => Number.isFinite(Number(value ?? 0)) ? Number(value ?? 0) : 0

export async function getHomebaseLabor(studioId: string | undefined, startDate: string, endDate: string, allowedStudioIds: number[]) {
  let dailyQuery = supabase.from("homebase_labor_daily_reporting").select("studio_id,studio_name,labor_date,scheduled_hours,actual_hours,scheduled_cost,actual_cost,best_available_cost,cost_basis").gte("labor_date", startDate).lte("labor_date", endDate).order("labor_date")
  let classQuery = supabase.from("homebase_class_labor_reporting").select("studio_id,source_event_key,event_date,class_time,painting,class_revenue,allocated_labor_cost,allocated_labor_hours,contributing_shifts,allocation_method").gte("event_date", startDate).lte("event_date", endDate).order("class_time")
  if (studioId && studioId !== "all") { dailyQuery = dailyQuery.eq("studio_id", studioId); classQuery = classQuery.eq("studio_id", studioId) }
  else { dailyQuery = dailyQuery.in("studio_id", allowedStudioIds); classQuery = classQuery.in("studio_id", allowedStudioIds) }
  const [dailyResult, classResult] = await Promise.all([dailyQuery, classQuery])
  if (dailyResult.error) throw dailyResult.error
  if (classResult.error) throw classResult.error
  const daily = ((dailyResult.data ?? []) as DailyRow[]).map(row => ({ ...row, scheduledHours:num(row.scheduled_hours),actualHours:num(row.actual_hours),scheduledCost:num(row.scheduled_cost),actualCost:num(row.actual_cost),laborCost:num(row.best_available_cost) }))
  const classes = ((classResult.data ?? []) as ClassRow[]).map(row => ({ studioId:row.studio_id,eventKey:row.source_event_key,eventDate:row.event_date,classTime:row.class_time,painting:row.painting ?? "Untitled class",revenue:num(row.class_revenue),laborCost:num(row.allocated_labor_cost),laborHours:num(row.allocated_labor_hours),contributingShifts:num(row.contributing_shifts),allocationMethod:row.allocation_method }))
  return { startDate,endDate,totals:{ scheduledHours:daily.reduce((s,r)=>s+r.scheduledHours,0),actualHours:daily.reduce((s,r)=>s+r.actualHours,0),scheduledCost:daily.reduce((s,r)=>s+r.scheduledCost,0),actualCost:daily.reduce((s,r)=>s+r.actualCost,0),laborCost:daily.reduce((s,r)=>s+r.laborCost,0),classRevenue:classes.reduce((s,r)=>s+r.revenue,0),allocatedClassLabor:classes.reduce((s,r)=>s+r.laborCost,0) },daily,classes }
}
