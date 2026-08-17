import { supabase } from "@/lib/supabase/server"

type Row = { postal_code: string; order_count: number | string; booked_sales: number | string; discounted_order_count: number | string; discount_amount: number | string }
const n = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

export async function getOrderGeography(studioId: string | undefined, startDate: string, endDate: string, allowedStudioIds?: number[]) {
  let query = supabase.from("pts_order_geography_daily")
    .select("postal_code,order_count,booked_sales,discounted_order_count,discount_amount")
    .gte("order_date", startDate).lte("order_date", endDate).range(0, 9999)
  if (studioId && studioId !== "all") query = query.eq("studio_id", studioId)
  else if (allowedStudioIds) query = query.in("studio_id", allowedStudioIds)
  const { data, error } = await query
  if (error) throw error
  const byZip = new Map<string, { zipCode: string; orderCount: number; bookedSales: number; discountedOrderCount: number; discountAmount: number }>()
  for (const row of (data ?? []) as Row[]) {
    const value = byZip.get(row.postal_code) ?? { zipCode: row.postal_code, orderCount: 0, bookedSales: 0, discountedOrderCount: 0, discountAmount: 0 }
    value.orderCount += n(row.order_count); value.bookedSales += n(row.booked_sales)
    value.discountedOrderCount += n(row.discounted_order_count); value.discountAmount += n(row.discount_amount)
    byZip.set(row.postal_code, value)
  }
  const rows = [...byZip.values()].map(row => ({ ...row, averageOrderValue: row.orderCount ? row.bookedSales / row.orderCount : 0, discountRate: row.orderCount ? row.discountedOrderCount / row.orderCount * 100 : 0 })).sort((a, b) => b.bookedSales - a.bookedSales)
  const totals = rows.reduce((sum, row) => ({ orderCount: sum.orderCount + row.orderCount, bookedSales: sum.bookedSales + row.bookedSales, discountedOrderCount: sum.discountedOrderCount + row.discountedOrderCount, discountAmount: sum.discountAmount + row.discountAmount }), { orderCount: 0, bookedSales: 0, discountedOrderCount: 0, discountAmount: 0 })
  return { startDate, endDate, totals: { ...totals, averageOrderValue: totals.orderCount ? totals.bookedSales / totals.orderCount : 0, discountRate: totals.orderCount ? totals.discountedOrderCount / totals.orderCount * 100 : 0 }, rows: rows.map(row => ({ ...row, revenueShare: totals.bookedSales ? row.bookedSales / totals.bookedSales * 100 : 0 })) }
}
