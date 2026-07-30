import { supabase } from "@/lib/supabase/server"

type SalesRow = {
  report_date: string
  net_sales: number | string | null
  class_sales: number | string | null
  alcohol_sales: number | string | null
  other_product_sales: number | string | null
  seats_sold: number | null
  attendance_percent: number | string | null
}

type ProductRow = {
  report_date: string
  category: string | null
  subcategory: string | null
  item_name: string | null
  quantity: number | string | null
  net_sales: number | string | null
}

export type OperationsDashboardData = {
  period: { startDate: string; endDate: string; days: number }
  kpis: {
    totalSales: number
    classSales: number
    foodBeverageSales: number
    foodBeverageShare: number
    merchandiseSales: number
    seatsSold: number
    revenuePerSeat: number
    foodBeveragePerSeat: number
    attendancePercent: number
    averageDailySales: number
  }
  daily: Array<{
    date: string
    totalSales: number
    classSales: number
    foodBeverageSales: number
    merchandiseSales: number
    seatsSold: number
    revenuePerSeat: number
    foodBeveragePerSeat: number
  }>
  foodBeverage: Array<{
    subcategory: string
    sales: number
    quantity: number
    share: number
    items: Array<{ name: string; sales: number; quantity: number }>
  }>
}

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function addStudioFilter<T>(query: T, studioId?: string): T {
  if (studioId && studioId !== "all") {
    return (query as T & { eq: (column: string, value: string) => T }).eq(
      "studio_id",
      studioId
    )
  }
  return query
}

export async function getOperationsDashboard(
  studioId?: string,
  startDate?: string,
  endDate?: string
): Promise<OperationsDashboardData> {
  const periodEnd = endDate ?? new Date().toISOString().slice(0, 10)
  const fallbackStart = new Date(`${periodEnd}T00:00:00Z`)
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 6)
  const periodStart = startDate ?? fallbackStart.toISOString().slice(0, 10)

  const salesQuery = addStudioFilter(
    supabase
      .from("pts_sales_daily_summary")
      .select(
        "report_date,net_sales,class_sales,alcohol_sales,other_product_sales,seats_sold,attendance_percent"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const productsQuery = addStudioFilter(
    supabase
      .from("pts_non_class_sales_items")
      .select("report_date,category,subcategory,item_name,quantity,net_sales")
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )

  const [salesResult, productsResult] = await Promise.all([
    salesQuery.order("report_date").range(0, 4999),
    productsQuery.order("report_date").range(0, 9999),
  ])

  if (salesResult.error) throw salesResult.error
  if (productsResult.error) throw productsResult.error

  const salesRows = (salesResult.data ?? []) as SalesRow[]
  const productRows = (productsResult.data ?? []) as ProductRow[]
  const dailyMap = new Map<
    string,
    OperationsDashboardData["daily"][number]
  >()

  for (const row of salesRows) {
    const current = dailyMap.get(row.report_date) ?? {
      date: row.report_date,
      totalSales: 0,
      classSales: 0,
      foodBeverageSales: 0,
      merchandiseSales: 0,
      seatsSold: 0,
      revenuePerSeat: 0,
      foodBeveragePerSeat: 0,
    }
    current.totalSales += numberValue(row.net_sales)
    current.classSales += numberValue(row.class_sales)
    current.seatsSold += numberValue(row.seats_sold)
    dailyMap.set(row.report_date, current)
  }

  const foodBeverageMap = new Map<
    string,
    OperationsDashboardData["foodBeverage"][number]
  >()

  for (const row of productRows) {
    const sales = numberValue(row.net_sales)
    const quantity = numberValue(row.quantity)
    const current = dailyMap.get(row.report_date) ?? {
      date: row.report_date,
      totalSales: 0,
      classSales: 0,
      foodBeverageSales: 0,
      merchandiseSales: 0,
      seatsSold: 0,
      revenuePerSeat: 0,
      foodBeveragePerSeat: 0,
    }

    if (row.category === "Food & Beverage") {
      current.foodBeverageSales += sales
      const subcategory = row.subcategory || "Uncategorized"
      const group = foodBeverageMap.get(subcategory) ?? {
        subcategory,
        sales: 0,
        quantity: 0,
        share: 0,
        items: [],
      }
      group.sales += sales
      group.quantity += quantity
      const itemName = row.item_name || "Unnamed item"
      const item = group.items.find((candidate) => candidate.name === itemName)
      if (item) {
        item.sales += sales
        item.quantity += quantity
      } else {
        group.items.push({ name: itemName, sales, quantity })
      }
      foodBeverageMap.set(subcategory, group)
    } else {
      current.merchandiseSales += sales
    }
    dailyMap.set(row.report_date, current)
  }

  const daily = [...dailyMap.values()]
    .map((row) => ({
      ...row,
      revenuePerSeat: row.seatsSold ? row.totalSales / row.seatsSold : 0,
      foodBeveragePerSeat: row.seatsSold
        ? row.foodBeverageSales / row.seatsSold
        : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totals = daily.reduce(
    (sum, row) => ({
      totalSales: sum.totalSales + row.totalSales,
      classSales: sum.classSales + row.classSales,
      foodBeverageSales: sum.foodBeverageSales + row.foodBeverageSales,
      merchandiseSales: sum.merchandiseSales + row.merchandiseSales,
      seatsSold: sum.seatsSold + row.seatsSold,
    }),
    {
      totalSales: 0,
      classSales: 0,
      foodBeverageSales: 0,
      merchandiseSales: 0,
      seatsSold: 0,
    }
  )
  const attendance = salesRows.reduce(
    (sum, row) => sum + numberValue(row.attendance_percent),
    0
  )
  const foodBeverage = [...foodBeverageMap.values()]
    .map((group) => ({
      ...group,
      share: totals.foodBeverageSales
        ? (group.sales / totals.foodBeverageSales) * 100
        : 0,
      items: group.items.sort((a, b) => b.sales - a.sales),
    }))
    .sort((a, b) => b.sales - a.sales)

  return {
    period: {
      startDate: periodStart,
      endDate: periodEnd,
      days:
        Math.round(
          (Date.parse(periodEnd) - Date.parse(periodStart)) / 86_400_000
        ) + 1,
    },
    kpis: {
      ...totals,
      foodBeverageShare: totals.totalSales
        ? (totals.foodBeverageSales / totals.totalSales) * 100
        : 0,
      revenuePerSeat: totals.seatsSold
        ? totals.totalSales / totals.seatsSold
        : 0,
      foodBeveragePerSeat: totals.seatsSold
        ? totals.foodBeverageSales / totals.seatsSold
        : 0,
      attendancePercent: salesRows.length ? attendance / salesRows.length : 0,
      averageDailySales: daily.length ? totals.totalSales / daily.length : 0,
    },
    daily,
    foodBeverage,
  }
}
