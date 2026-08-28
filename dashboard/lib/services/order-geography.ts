import { supabase } from "@/lib/supabase/server"

type GeographyRow = { studio_id: number | string; postal_code: string; order_count: number | string; booked_sales: number | string }
type OrderRow = { studio_id: number | string; order_id: string; booked_sales: number | string; discount_amount: number | string; discount_used: boolean; discount_details: unknown }
type DiscountDetail = { code?: unknown; amount?: unknown; description?: unknown }
type StudioRow = { id: number | string; studio_name: string; city: string; state: string }
type IntegrationRow = { studio_id: number | string; configuration: unknown }
type MapLocation = { address?: unknown; latitude?: unknown; longitude?: unknown }
const n = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0
const clean = (value: unknown) => typeof value === "string" ? value.trim() : ""

export async function getOrderGeography(studioId: string | undefined, startDate: string, endDate: string, allowedStudioIds?: number[]) {
  let geographyQuery = supabase.from("pts_order_geography_daily").select("studio_id,postal_code,order_count,booked_sales").gte("order_date", startDate).lte("order_date", endDate).range(0, 9999)
  let orderQuery = supabase.from("pts_order_attributes").select("studio_id,order_id,booked_sales,discount_amount,discount_used,discount_details").gte("order_date", startDate).lte("order_date", endDate).range(0, 9999)
  if (studioId && studioId !== "all") { geographyQuery = geographyQuery.eq("studio_id", studioId); orderQuery = orderQuery.eq("studio_id", studioId) }
  else if (allowedStudioIds) { geographyQuery = geographyQuery.in("studio_id", allowedStudioIds); orderQuery = orderQuery.in("studio_id", allowedStudioIds) }
  let studioQuery = supabase.from("studios").select("id,studio_name,city,state").eq("active", true)
  let integrationQuery = supabase.from("studio_integrations").select("studio_id,configuration").eq("integration_type", "pts").eq("is_active", true)
  if (studioId && studioId !== "all") { studioQuery = studioQuery.eq("id", studioId); integrationQuery = integrationQuery.eq("studio_id", studioId) }
  else if (allowedStudioIds) { studioQuery = studioQuery.in("id", allowedStudioIds); integrationQuery = integrationQuery.in("studio_id", allowedStudioIds) }
  const [{ data: geographyData, error: geographyError }, { data: orderData, error: orderError }, { data: studioData, error: studioError }, { data: integrationData, error: integrationError }] = await Promise.all([geographyQuery, orderQuery, studioQuery, integrationQuery])
  if (geographyError) throw geographyError
  if (orderError) throw orderError
  if (studioError) throw studioError
  if (integrationError) throw integrationError

  const byZip = new Map<string, { studioId: number; zipCode: string; orderCount: number; bookedSales: number }>()
  for (const row of (geographyData ?? []) as GeographyRow[]) {
    const studioId = n(row.studio_id); const key = `${studioId}:${row.postal_code}`
    const value = byZip.get(key) ?? { studioId, zipCode: row.postal_code, orderCount: 0, bookedSales: 0 }
    value.orderCount += n(row.order_count); value.bookedSales += n(row.booked_sales); byZip.set(key, value)
  }
  const orders = (orderData ?? []) as OrderRow[]
  const totals = orders.reduce((sum, row) => ({ orderCount: sum.orderCount + 1, bookedSales: sum.bookedSales + n(row.booked_sales), discountedOrderCount: sum.discountedOrderCount + (row.discount_used ? 1 : 0), discountAmount: sum.discountAmount + n(row.discount_amount) }), { orderCount: 0, bookedSales: 0, discountedOrderCount: 0, discountAmount: 0 })
  const byCode = new Map<string, { studioId: number; code: string; description: string; orderIds: Set<string>; discountAmount: number }>()
  for (const order of orders) {
    if (!order.discount_used) continue
    const details = Array.isArray(order.discount_details) ? order.discount_details as DiscountDetail[] : []
    const positiveDetails = details.filter(detail => n(detail.amount) > 0)
    const effectiveDetails = positiveDetails.length ? positiveDetails : [{ code: "Unidentified", amount: order.discount_amount, description: "Discount code unavailable" }]
    for (const detail of effectiveDetails) {
      const studioId = n(order.studio_id); const code = clean(detail.code) || "Unidentified"; const description = clean(detail.description) || code; const key = `${studioId}:${code}`
      const value = byCode.get(key) ?? { studioId, code, description, orderIds: new Set<string>(), discountAmount: 0 }
      value.orderIds.add(order.order_id); value.discountAmount += n(detail.amount)
      if (description.length > value.description.length) value.description = description
      byCode.set(key, value)
    }
  }
  const studioSales = new Map<number, number>()
  for (const row of byZip.values()) studioSales.set(row.studioId, (studioSales.get(row.studioId) ?? 0) + row.bookedSales)
  const rows = [...byZip.values()].map(row => ({ ...row, averageOrderValue: row.orderCount ? row.bookedSales / row.orderCount : 0, revenueShare: studioSales.get(row.studioId) ? row.bookedSales / (studioSales.get(row.studioId) ?? 1) * 100 : 0 })).sort((a, b) => b.bookedSales - a.bookedSales)
  const discountCodes = [...byCode.values()].map(value => ({ studioId: value.studioId, code: value.code, description: value.description, orderCount: value.orderIds.size, discountAmount: value.discountAmount, averageDiscount: value.orderIds.size ? value.discountAmount / value.orderIds.size : 0 })).sort((a, b) => b.discountAmount - a.discountAmount)
  const locations = new Map<number, MapLocation>()
  for (const integration of (integrationData ?? []) as IntegrationRow[]) {
    const configuration = integration.configuration && typeof integration.configuration === "object" ? integration.configuration as { map_location?: MapLocation } : null
    if (configuration?.map_location) locations.set(n(integration.studio_id), configuration.map_location)
  }
  const studios = ((studioData ?? []) as StudioRow[]).map(studio => {
    const location = locations.get(n(studio.id))
    return {
      id: n(studio.id), name: studio.studio_name, city: studio.city, state: studio.state,
      address: typeof location?.address === "string" ? location.address : null,
      latitude: location?.latitude != null && Number.isFinite(Number(location.latitude)) ? Number(location.latitude) : null,
      longitude: location?.longitude != null && Number.isFinite(Number(location.longitude)) ? Number(location.longitude) : null,
    }
  })
  return { startDate, endDate, totals: { ...totals, averageOrderValue: totals.orderCount ? totals.bookedSales / totals.orderCount : 0, discountRate: totals.orderCount ? totals.discountedOrderCount / totals.orderCount * 100 : 0 }, rows, discountCodes, studios }
}
