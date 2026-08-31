import "server-only"
import { supabase } from "@/lib/supabase/server"
import { buildTourismReport, type TourismLocalMarket, type TourismSourceRow, type TourismStudio } from "@/lib/reports/tourism"

type GeographyRow = { studio_id: number | string; postal_code: string; order_count: number | string; booked_sales: number | string }
type StudioRow = { id: number | string; studio_name: string; state: string }
type IntegrationRow = { studio_id: number | string; configuration: unknown }
const n = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

function readLocalMarket(configuration: unknown): TourismLocalMarket | undefined {
  if (!configuration || typeof configuration !== "object") return undefined
  const value = (configuration as { tourism_local_market?: unknown }).tourism_local_market
  if (!value || typeof value !== "object") return undefined
  const market = value as { name?: unknown; definition?: unknown; source?: unknown; zip_codes?: unknown }
  if (typeof market.name !== "string" || typeof market.definition !== "string" || typeof market.source !== "string" || !Array.isArray(market.zip_codes)) return undefined
  const zipCodes = market.zip_codes.filter((zipCode): zipCode is string => typeof zipCode === "string" && /^\d{5}$/.test(zipCode))
  return zipCodes.length ? { name: market.name, definition: market.definition, source: market.source, zipCodes: [...new Set(zipCodes)] } : undefined
}

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
  const reportStudioIds = ((studioData ?? []) as StudioRow[]).map(row => n(row.id))
  const { data: integrationData, error: integrationError } = reportStudioIds.length
    ? await supabase.from("studio_integrations").select("studio_id,configuration").in("studio_id", reportStudioIds).eq("integration_type", "pts").eq("is_active", true)
    : { data: [], error: null }
  if (integrationError) throw integrationError
  const localMarkets = new Map(((integrationData ?? []) as IntegrationRow[]).map(row => [n(row.studio_id), readLocalMarket(row.configuration)]))
  const grouped = new Map<string, TourismSourceRow>()
  for (const row of source) {
    const id = n(row.studio_id); const key = `${id}:${row.postal_code}`
    const value = grouped.get(key) ?? { studioId: id, zipCode: row.postal_code, orderCount: 0, bookedSales: 0 }
    value.orderCount += n(row.order_count); value.bookedSales += n(row.booked_sales); grouped.set(key, value)
  }
  const studios = ((studioData ?? []) as StudioRow[]).map(row => ({ id: n(row.id), name: row.studio_name, state: row.state, localMarket: localMarkets.get(n(row.id)) })) as TourismStudio[]
  return { startDate, endDate, studios: buildTourismReport([...grouped.values()], studios) }
}
