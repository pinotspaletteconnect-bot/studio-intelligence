import "server-only"
import { supabase } from "@/lib/supabase/server"
import { buildTourismReport, type TourismSourceRow, type TourismStudio } from "@/lib/reports/tourism"

type GeographyRow = { studio_id: number | string; postal_code: string; order_count: number | string; booked_sales: number | string }
type StudioRow = { id: number | string; studio_name: string; state: string }
const n = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

export async function getTourismReport(studioId: string | undefined, startDate: string, endDate: string, allowedStudioIds: number[]) {
  const source: GeographyRow[] = []
  for (let from = 0; ; from += 1000) {
    let query = supabase.from("pts_order_geography_daily").select("studio_id,postal_code,order_count,booked_sales").gte("order_date", startDate).lte("order_date", endDate).range(from, from + 999)
    if (studioId && studioId !== "all") query = query.eq("studio_id", studioId)
    else query = query.in("studio_id", allowedStudioIds)
    const { data, error } = await query
    if (error) throw error
    source.push(...((data ?? []) as GeographyRow[]))
    if ((data?.length ?? 0) < 1000) break
  }
  let studioQuery = supabase.from("studios").select("id,studio_name,state").eq("active", true)
  if (studioId && studioId !== "all") studioQuery = studioQuery.eq("id", studioId)
  else studioQuery = studioQuery.in("id", allowedStudioIds)
  const { data: studioData, error: studioError } = await studioQuery
  if (studioError) throw studioError
  const grouped = new Map<string, TourismSourceRow>()
  for (const row of source) {
    const id = n(row.studio_id); const key = `${id}:${row.postal_code}`
    const value = grouped.get(key) ?? { studioId: id, zipCode: row.postal_code, orderCount: 0, bookedSales: 0 }
    value.orderCount += n(row.order_count); value.bookedSales += n(row.booked_sales); grouped.set(key, value)
  }
  const studios = ((studioData ?? []) as StudioRow[]).map(row => ({ id: n(row.id), name: row.studio_name, state: row.state })) as TourismStudio[]
  return { startDate, endDate, studios: buildTourismReport([...grouped.values()], studios) }
}
