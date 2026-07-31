import { supabase } from "@/lib/supabase/server"

type DailyOperationsRow = {
  studio_id: number
  report_date: string
  class_event_count: number | string | null
  seats_sold: number | string | null
  capacity: number | string | null
  class_sales: number | string | null
  fee_sales: number | string | null
  product_sales: number | string | null
  food_and_beverage_sales: number | string | null
  other_product_sales: number | string | null
  unmapped_product_sales: number | string | null
  total_sales: number | string | null
}

type ProductRow = {
  report_date: string
  product_group: string | null
  department: string | null
  subcategory: string | null
  item_name: string | null
  quantity: number | string | null
  net_sales: number | string | null
}

type ClassTypeRow = {
  reporting_class_type: string
  class_event_count: number | string | null
  seats_sold: number | string | null
  class_sales: number | string | null
  fee_sales: number | string | null
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
  studioSales: Array<{
    studioId: number
    studioName: string
    daily: Array<{ date: string; totalSales: number }>
  }>
  classTypes: Array<{
    name: string
    events: number
    seatsSold: number
    classSales: number
    feeSales: number
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

  const dailyQuery = addStudioFilter(
    supabase
      .from("pts_operations_daily")
      .select(
        "studio_id,report_date,class_event_count,seats_sold,capacity,class_sales,fee_sales,product_sales,food_and_beverage_sales,other_product_sales,unmapped_product_sales,total_sales"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const productsQuery = addStudioFilter(
    supabase
      .from("pts_product_sales_daily_reporting")
      .select(
        "report_date,product_group,department,subcategory,item_name,quantity,net_sales"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const classTypesQuery = addStudioFilter(
    supabase
      .from("pts_class_type_sales_daily_reporting")
      .select(
        "reporting_class_type,class_event_count,seats_sold,class_sales,fee_sales"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )

  const [dailyResult, productsResult, classTypesResult] = await Promise.all([
    dailyQuery.order("report_date").range(0, 4999),
    productsQuery.order("report_date").range(0, 9999),
    classTypesQuery.order("report_date").range(0, 4999),
  ])

  if (dailyResult.error) throw dailyResult.error
  if (productsResult.error) throw productsResult.error
  if (classTypesResult.error) throw classTypesResult.error

  const dailyRows = (dailyResult.data ?? []) as DailyOperationsRow[]
  const productRows = (productsResult.data ?? []) as ProductRow[]
  const classTypeRows = (classTypesResult.data ?? []) as ClassTypeRow[]
  const studioIds = [...new Set(dailyRows.map((row) => row.studio_id))]
  const studioNames = new Map<number, string>()

  if (studioIds.length) {
    const { data: studios, error: studiosError } = await supabase
      .from("studios")
      .select("id,studio_name")
      .in("id", studioIds)

    if (studiosError) throw studiosError
    for (const studio of studios ?? []) {
      studioNames.set(studio.id, studio.studio_name)
    }
  }

  const dailyMap = new Map<
    string,
    OperationsDashboardData["daily"][number] & { capacity: number }
  >()
  const studioDailyMap = new Map<number, Map<string, number>>()

  for (const row of dailyRows) {
    const current = dailyMap.get(row.report_date) ?? {
      date: row.report_date,
      totalSales: 0,
      classSales: 0,
      foodBeverageSales: 0,
      merchandiseSales: 0,
      seatsSold: 0,
      capacity: 0,
      revenuePerSeat: 0,
      foodBeveragePerSeat: 0,
    }
    current.totalSales += numberValue(row.total_sales)
    current.classSales += numberValue(row.class_sales)
    current.foodBeverageSales += numberValue(row.food_and_beverage_sales)
    current.merchandiseSales +=
      numberValue(row.other_product_sales) +
      numberValue(row.unmapped_product_sales)
    current.seatsSold += numberValue(row.seats_sold)
    current.capacity += numberValue(row.capacity)
    dailyMap.set(row.report_date, current)

    const studioDays =
      studioDailyMap.get(row.studio_id) ?? new Map<string, number>()
    studioDays.set(
      row.report_date,
      (studioDays.get(row.report_date) ?? 0) + numberValue(row.total_sales)
    )
    studioDailyMap.set(row.studio_id, studioDays)
  }

  const foodBeverageMap = new Map<
    string,
    OperationsDashboardData["foodBeverage"][number]
  >()

  for (const row of productRows) {
    if (row.department !== "Food & Beverage") continue

    const sales = numberValue(row.net_sales)
    const quantity = numberValue(row.quantity)
    const subcategory =
      row.product_group || row.subcategory || "Uncategorized"
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
  }

  const classTypeMap = new Map<
    string,
    OperationsDashboardData["classTypes"][number]
  >()
  for (const row of classTypeRows) {
    const name = row.reporting_class_type
    const group = classTypeMap.get(name) ?? {
      name,
      events: 0,
      seatsSold: 0,
      classSales: 0,
      feeSales: 0,
    }
    group.events += numberValue(row.class_event_count)
    group.seatsSold += numberValue(row.seats_sold)
    group.classSales += numberValue(row.class_sales)
    group.feeSales += numberValue(row.fee_sales)
    classTypeMap.set(name, group)
  }

  const daily = [...dailyMap.values()]
    .map((row) => ({
      date: row.date,
      totalSales: row.totalSales,
      classSales: row.classSales,
      foodBeverageSales: row.foodBeverageSales,
      merchandiseSales: row.merchandiseSales,
      seatsSold: row.seatsSold,
      revenuePerSeat: row.seatsSold ? row.totalSales / row.seatsSold : 0,
      foodBeveragePerSeat: row.seatsSold
        ? row.foodBeverageSales / row.seatsSold
        : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totals = [...dailyMap.values()].reduce(
    (sum, row) => ({
      totalSales: sum.totalSales + row.totalSales,
      classSales: sum.classSales + row.classSales,
      foodBeverageSales: sum.foodBeverageSales + row.foodBeverageSales,
      merchandiseSales: sum.merchandiseSales + row.merchandiseSales,
      seatsSold: sum.seatsSold + row.seatsSold,
      capacity: sum.capacity + row.capacity,
    }),
    {
      totalSales: 0,
      classSales: 0,
      foodBeverageSales: 0,
      merchandiseSales: 0,
      seatsSold: 0,
      capacity: 0,
    }
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
  const studioSales = [...studioDailyMap.entries()]
    .map(([currentStudioId, studioDays]) => ({
      studioId: currentStudioId,
      studioName:
        studioNames.get(currentStudioId) ?? `Studio ${currentStudioId}`,
      daily: [...studioDays.entries()]
        .map(([date, totalSales]) => ({ date, totalSales }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.studioName.localeCompare(b.studioName))

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
      attendancePercent: totals.capacity
        ? (totals.seatsSold / totals.capacity) * 100
        : 0,
      averageDailySales: daily.length ? totals.totalSales / daily.length : 0,
    },
    daily,
    studioSales,
    classTypes: [...classTypeMap.values()].sort(
      (a, b) => b.classSales - a.classSales
    ),
    foodBeverage,
  }
}
