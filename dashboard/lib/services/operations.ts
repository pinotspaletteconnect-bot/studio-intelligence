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
  studio_id: number
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
  class_event_count?: number | string | null
  seats_sold: number | string | null
  class_sales: number | string | null
  fee_sales: number | string | null
}

type ClassLeadTimeRow = {
  seats_sold: number | string | null
  lead_time_average: number | string | null
}

export type OperationsDashboardData = {
  period: { startDate: string; endDate: string; days: number }
  comparison?: {
    label: string
    period: { startDate: string; endDate: string }
    kpis: OperationsDashboardData["kpis"]
    changes: Partial<
      Record<
        keyof OperationsDashboardData["kpis"],
        { absolute: number; percent: number | null }
      >
    >
  }
  kpis: {
    totalSales: number
    classSales: number
    foodBeverageSales: number
    foodBeverageShare: number
    candleSales: number
    candleQuantity: number
    artSuppliesSales: number
    artSuppliesQuantity: number
    foodSales: number
    foodQuantity: number
    merchandiseSales: number
    seatsSold: number
    revenuePerSeat: number
    foodBeveragePerSeat: number
    attendancePercent: number
    averageLeadTime: number
    privatePartyEvents: number
    privatePartyAverageSeats: number
    privatePartyAverageRevenue: number
    mobileEventCount: number
    mobileEventAverageSeats: number
    mobileEventAverageRevenue: number
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
    totalSales: number
    seatsSold: number
    foodBeverageShare: number
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

type ClassDetailRow = {
  id: number
  studio_id: number
  painting: string | null
  class_time: string | null
  room: string | null
  source_class_type: string | null
  reporting_class_type: string
  seats_sold: number | string | null
  capacity: number | string | null
  lead_time_average: number | string | null
  class_sales: number | string | null
  product_sales: number | string | null
  fee_sales: number | string | null
  net_sales: number | string | null
}

type DailyDetailOperationsRow = {
  studio_id: number
  seats_sold: number | string | null
  food_and_beverage_sales: number | string | null
  total_sales: number | string | null
}

export type DailyOperatingDetailData = {
  date: string
  totals: {
    classes: number
    seatsSold: number
    capacity: number
    percentFull: number
    averageLeadTime: number | null
    foodBeverageSales: number
    revenuePerSeat: number
    netSales: number
  }
  studios: Array<{
    id: number
    name: string
    totals: DailyOperatingDetailData["totals"]
    classes: Array<{
      id: number
      painting: string
      classTime: string | null
      room: string
      sourceClassType: string
      reportingClassType: string
      seatsSold: number
      capacity: number
      percentFull: number
      leadTimeAverage: number | null
      classSales: number
      productSales: number
      feeSales: number
      netSales: number
    }>
  }>
}

export type CandleSalesDetailData = {
  period: { startDate: string; endDate: string }
  totals: { sales: number; quantity: number }
  studios: Array<{
    id: number
    name: string
    sales: number
    quantity: number
    items: Array<{
      date: string
      name: string
      subcategory: string
      quantity: number
      sales: number
    }>
  }>
}

type ClassEventDetailRow = {
  id: number
  studio_id: number
  event_date: string
  painting: string | null
  class_time: string | null
  room: string | null
  source_class_type: string | null
  seats_sold: number | string | null
  capacity: number | string | null
  class_sales: number | string | null
  fee_sales: number | string | null
  net_sales: number | string | null
}

export type ClassEventSalesDetailData = {
  period: { startDate: string; endDate: string }
  totals: { events: number; seatsSold: number; revenue: number }
  studios: Array<{
    id: number
    name: string
    events: number
    seatsSold: number
    revenue: number
    classes: Array<{
      id: number
      date: string
      painting: string
      classTime: string | null
      room: string
      sourceClassType: string
      seatsSold: number
      capacity: number
      revenue: number
    }>
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

async function getPagedProductRows(
  table: "pts_product_sales_reporting" | "pts_product_sales_daily_reporting",
  periodStart: string,
  periodEnd: string,
  studioId?: string
): Promise<ProductRow[]> {
  const pageSize = 1000
  const rows: ProductRow[] = []

  for (let page = 0; page < 20; page += 1) {
    const from = page * pageSize
    const query = addStudioFilter(
      supabase
        .from(table)
        .select(
          "studio_id,report_date,product_group,department,subcategory,item_name,quantity,net_sales"
        )
        .gte("report_date", periodStart)
        .lte("report_date", periodEnd),
      studioId
    )
    const result = await query
      .order("report_date")
      .range(from, from + pageSize - 1)

    if (result.error) throw result.error

    const pageRows = (result.data ?? []) as ProductRow[]
    rows.push(...pageRows)
    if (pageRows.length < pageSize) return rows
  }

  throw new Error("PTS product query exceeded the 20,000-row safety limit")
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

  const currentDailyQuery = addStudioFilter(
    supabase
      .from("pts_daily_operations_reporting")
      .select(
        "studio_id,report_date,class_event_count,seats_sold:class_reported_seats_sold,capacity:class_reported_capacity,class_sales:class_reported_class_sales,fee_sales:class_reported_fee_sales,product_sales:class_reported_product_sales,food_and_beverage_sales,other_product_sales:detailed_other_product_sales,unmapped_product_sales,total_sales:class_reported_net_sales"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const classTypesQuery = addStudioFilter(
    supabase
      .from("pts_class_sales_reporting")
      .select(
        "reporting_class_type,seats_sold,class_sales,fee_sales"
      )
      .gte("event_date", periodStart)
      .lte("event_date", periodEnd),
    studioId
  )
  const historicalDailyQuery = addStudioFilter(
    supabase
      .from("pts_operations_daily")
      .select(
        "studio_id,report_date,class_event_count,seats_sold,capacity,class_sales,fee_sales,product_sales,food_and_beverage_sales,other_product_sales,unmapped_product_sales,total_sales"
      )
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const classLeadTimeQuery = addStudioFilter(
    supabase
      .from("pts_class_sales_reporting")
      .select("seats_sold,lead_time_average")
      .gte("event_date", periodStart)
      .lte("event_date", periodEnd)
      .not("lead_time_average", "is", null),
    studioId
  )

  const [
    currentDailyResult,
    historicalDailyResult,
    currentProductRows,
    historicalProductRows,
    classTypesResult,
    classLeadTimeResult,
  ] =
    await Promise.all([
      currentDailyQuery.order("report_date").range(0, 4999),
      historicalDailyQuery.order("report_date").range(0, 4999),
      getPagedProductRows(
        "pts_product_sales_reporting",
        periodStart,
        periodEnd,
        studioId
      ),
      getPagedProductRows(
        "pts_product_sales_daily_reporting",
        periodStart,
        periodEnd,
        studioId
      ),
      classTypesQuery.order("event_date").range(0, 4999),
      classLeadTimeQuery.range(0, 4999),
    ])

  if (currentDailyResult.error) throw currentDailyResult.error
  if (historicalDailyResult.error) throw historicalDailyResult.error
  if (classTypesResult.error) throw classTypesResult.error
  if (classLeadTimeResult.error) throw classLeadTimeResult.error

  // The range-import table preserves historical dashboard dates while the
  // daily-production view supplies newly collected dates. Prefer production
  // rows for the same studio/date so overlapping imports are never doubled.
  const dailyRowsByStudioDate = new Map<string, DailyOperationsRow>()
  for (const row of (historicalDailyResult.data ?? []) as DailyOperationsRow[]) {
    dailyRowsByStudioDate.set(`${row.studio_id}:${row.report_date}`, row)
  }
  for (const row of (currentDailyResult.data ?? []) as DailyOperationsRow[]) {
    dailyRowsByStudioDate.set(`${row.studio_id}:${row.report_date}`, row)
  }
  const dailyRows = [...dailyRowsByStudioDate.values()]
  const currentProductStudioDates = new Set(
    currentProductRows.map((row) => `${row.studio_id}:${row.report_date}`)
  )
  const allProductRows = [
    ...historicalProductRows.filter(
      (row) =>
        !currentProductStudioDates.has(`${row.studio_id}:${row.report_date}`)
    ),
    ...currentProductRows,
  ]
  const productRows = allProductRows.filter(
    (row) => {
      const productLabel = [
        row.product_group,
        row.subcategory,
        row.item_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      const isPreorderPlaceholder = /pre[\s-]*order/.test(productLabel)

      return (
        row.department === "Food & Beverage" &&
        (numberValue(row.net_sales) !== 0 || !isPreorderPlaceholder)
      )
    }
  )
  const candleRows = allProductRows.filter(
    (row) => {
      const productLabel = [row.subcategory, row.item_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return (
        row.product_group === "Candles" &&
        (numberValue(row.net_sales) !== 0 ||
          !/pre[\s-]*order/.test(productLabel))
      )
    }
  )
  const foodRows = allProductRows.filter((row) => {
    const label = [row.subcategory, row.item_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return (
      row.product_group === "Food" &&
      (numberValue(row.net_sales) !== 0 || !/pre[\s-]*order/.test(label))
    )
  })
  const artSuppliesRows = allProductRows.filter(
    (row) => row.product_group === "Art Supplies"
  )
  const classTypeRows = (classTypesResult.data ?? []) as ClassTypeRow[]
  const classLeadTimeRows = (classLeadTimeResult.data ?? []) as ClassLeadTimeRow[]
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
  const studioTotalsMap = new Map<
    number,
    { totalSales: number; seatsSold: number }
  >()
  const studioFoodBeverageMap = new Map<
    number,
    { foodBeverageSales: number; totalSales: number }
  >()
  const sourceFoodBeverageByStudioDate = new Map<string, number>()

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

    const studioTotals = studioTotalsMap.get(row.studio_id) ?? {
      totalSales: 0,
      seatsSold: 0,
    }
    studioTotals.totalSales += numberValue(row.total_sales)
    studioTotals.seatsSold += numberValue(row.seats_sold)
    studioTotalsMap.set(row.studio_id, studioTotals)

    const studioFoodBeverage = studioFoodBeverageMap.get(row.studio_id) ?? {
      foodBeverageSales: 0,
      totalSales: 0,
    }
    studioFoodBeverage.foodBeverageSales += numberValue(
      row.food_and_beverage_sales
    )
    studioFoodBeverage.totalSales += numberValue(row.total_sales)
    studioFoodBeverageMap.set(row.studio_id, studioFoodBeverage)
    sourceFoodBeverageByStudioDate.set(
      `${row.studio_id}:${row.report_date}`,
      numberValue(row.food_and_beverage_sales)
    )
  }

  // Product Sales is the auditable item-level source for F&B. When detail is
  // available for a studio/date, replace the summary amount so the KPI and
  // product drill-down reconcile. Preserve the summary fallback when product
  // detail has not been loaded for that studio/date.
  const detailedFoodBeverageByStudioDate = new Map<string, number>()
  for (const row of productRows) {
    const key = `${row.studio_id}:${row.report_date}`
    detailedFoodBeverageByStudioDate.set(
      key,
      (detailedFoodBeverageByStudioDate.get(key) ?? 0) +
        numberValue(row.net_sales)
    )
  }
  for (const [key, detailedSales] of detailedFoodBeverageByStudioDate) {
    const [studioIdText, reportDate] = key.split(":")
    const currentStudioId = Number(studioIdText)
    const difference =
      detailedSales - (sourceFoodBeverageByStudioDate.get(key) ?? 0)
    const day = dailyMap.get(reportDate)
    if (day) day.foodBeverageSales += difference
    const studioFoodBeverage = studioFoodBeverageMap.get(currentStudioId)
    if (studioFoodBeverage) {
      studioFoodBeverage.foodBeverageSales += difference
    }
  }

  const foodBeverageMap = new Map<
    string,
    OperationsDashboardData["foodBeverage"][number]
  >()
  const candleSales = candleRows.reduce(
    (sum, row) => sum + numberValue(row.net_sales),
    0
  )
  const candleQuantity = candleRows.reduce(
    (sum, row) => sum + numberValue(row.quantity),
    0
  )
  const artSuppliesSales = artSuppliesRows.reduce(
    (sum, row) => sum + numberValue(row.net_sales),
    0
  )
  const artSuppliesQuantity = artSuppliesRows.reduce(
    (sum, row) => sum + numberValue(row.quantity),
    0
  )
  const foodSales = foodRows.reduce(
    (sum, row) => sum + numberValue(row.net_sales),
    0
  )
  const foodQuantity = foodRows.reduce(
    (sum, row) => sum + numberValue(row.quantity),
    0
  )

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
    group.events += row.class_event_count === undefined
      ? 1
      : numberValue(row.class_event_count)
    group.seatsSold += numberValue(row.seats_sold)
    group.classSales += numberValue(row.class_sales)
    group.feeSales += numberValue(row.fee_sales)
    classTypeMap.set(name, group)
  }
  const privateParty = classTypeMap.get("Private Party")
  const mobileEvents = classTypeMap.get("Mobile Events")

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
  const leadTimeTotals = classLeadTimeRows.reduce(
    (sum, row) => {
      const seats = numberValue(row.seats_sold)
      return {
        weightedDays:
          sum.weightedDays + numberValue(row.lead_time_average) * seats,
        seats: sum.seats + seats,
      }
    },
    { weightedDays: 0, seats: 0 }
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
    .map(([currentStudioId, studioDays]) => {
      const studioFoodBeverage = studioFoodBeverageMap.get(currentStudioId)
      const studioTotals = studioTotalsMap.get(currentStudioId)

      return {
        studioId: currentStudioId,
        studioName:
          studioNames.get(currentStudioId) ?? `Studio ${currentStudioId}`,
        totalSales: studioTotals?.totalSales ?? 0,
        seatsSold: studioTotals?.seatsSold ?? 0,
        foodBeverageShare: studioFoodBeverage?.totalSales
          ? (studioFoodBeverage.foodBeverageSales /
              studioFoodBeverage.totalSales) *
            100
          : 0,
        daily: [...studioDays.entries()]
          .map(([date, totalSales]) => ({ date, totalSales }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }
    })
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
      candleSales,
      candleQuantity,
      artSuppliesSales,
      artSuppliesQuantity,
      foodSales,
      foodQuantity,
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
      averageLeadTime: leadTimeTotals.seats
        ? leadTimeTotals.weightedDays / leadTimeTotals.seats
        : 0,
      privatePartyEvents: privateParty?.events ?? 0,
      privatePartyAverageSeats: privateParty?.events
        ? privateParty.seatsSold / privateParty.events
        : 0,
      privatePartyAverageRevenue: privateParty?.events
        ? (privateParty.classSales + privateParty.feeSales) / privateParty.events
        : 0,
      mobileEventCount: mobileEvents?.events ?? 0,
      mobileEventAverageSeats: mobileEvents?.events
        ? mobileEvents.seatsSold / mobileEvents.events
        : 0,
      mobileEventAverageRevenue: mobileEvents?.events
        ? (mobileEvents.classSales + mobileEvents.feeSales) / mobileEvents.events
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

const shiftIsoDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function getOperationsDashboardWithComparison(
  studioId?: string,
  startDate?: string,
  endDate?: string,
  comparisonMode: "previous" | "priorYearWeek" | "custom" = "previous",
  customComparisonStart?: string,
  customComparisonEnd?: string
): Promise<OperationsDashboardData> {
  const current = await getOperationsDashboard(studioId, startDate, endDate)
  const duration = current.period.days
  const useCustomComparison =
    comparisonMode === "custom" &&
    Boolean(customComparisonStart && customComparisonEnd)
  const comparisonEnd = useCustomComparison
    ? customComparisonEnd!
    : comparisonMode === "priorYearWeek"
      ? shiftIsoDate(current.period.endDate, -364)
      : shiftIsoDate(current.period.startDate, -1)
  const comparisonStart = useCustomComparison
    ? customComparisonStart!
    : comparisonMode === "priorYearWeek"
      ? shiftIsoDate(current.period.startDate, -364)
      : shiftIsoDate(comparisonEnd, -(duration - 1))
  const previous = await getOperationsDashboard(
    studioId,
    comparisonStart,
    comparisonEnd
  )
  const changes: OperationsDashboardData["comparison"] extends infer T
    ? T extends { changes: infer C }
      ? C
      : never
    : never = {}

  for (const key of Object.keys(current.kpis) as Array<keyof typeof current.kpis>) {
    const currentValue = current.kpis[key]
    const previousValue = previous.kpis[key]
    changes[key] = {
      absolute: currentValue - previousValue,
      percent: previousValue
        ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
        : null,
    }
  }

  return {
    ...current,
    comparison: {
      label:
        useCustomComparison
          ? "Custom comparison"
          : comparisonMode === "priorYearWeek"
          ? "Same weekdays last year"
          : "Previous period",
      period: { startDate: comparisonStart, endDate: comparisonEnd },
      kpis: previous.kpis,
      changes,
    },
  }
}

export async function getDailyOperatingDetail(
  studioId: number | undefined,
  date: string
): Promise<DailyOperatingDetailData> {
  let classesQuery = supabase
    .from("pts_class_sales_reporting")
    .select(
      "id,studio_id,painting,class_time,room,source_class_type,reporting_class_type,seats_sold,capacity,lead_time_average,class_sales,product_sales,fee_sales,net_sales"
    )
    .eq("event_date", date)
    .order("class_time", { ascending: true })
    .range(0, 999)
  let studiosQuery = supabase.from("studios").select("id,studio_name")

  if (studioId) {
    classesQuery = classesQuery.eq("studio_id", studioId)
    studiosQuery = studiosQuery.eq("id", studioId)
  }
  let operationsQuery = supabase
    .from("pts_daily_operations_reporting")
    .select(
      "studio_id,seats_sold:class_reported_seats_sold,food_and_beverage_sales,total_sales:class_reported_net_sales"
    )
    .eq("report_date", date)
  if (studioId) operationsQuery = operationsQuery.eq("studio_id", studioId)

  const [classesResult, studioResult, operationsResult] = await Promise.all([
    classesQuery,
    studiosQuery.order("studio_name"),
    operationsQuery.range(0, 999),
  ])

  if (classesResult.error) throw classesResult.error
  if (studioResult.error) throw studioResult.error
  if (operationsResult.error) throw operationsResult.error

  const rows = ((classesResult.data ?? []) as ClassDetailRow[]).map((row) => {
    const seatsSold = numberValue(row.seats_sold)
    const capacity = numberValue(row.capacity)

    return {
      studioId: row.studio_id,
      class: {
      id: row.id,
      painting: row.painting || "Untitled class",
      classTime: row.class_time,
      room: row.room || "—",
      sourceClassType: row.source_class_type || "Unspecified",
      reportingClassType: row.reporting_class_type,
      seatsSold,
      capacity,
      percentFull: capacity ? (seatsSold / capacity) * 100 : 0,
      leadTimeAverage:
        row.lead_time_average === null ? null : numberValue(row.lead_time_average),
      classSales: numberValue(row.class_sales),
      productSales: numberValue(row.product_sales),
      feeSales: numberValue(row.fee_sales),
      netSales: numberValue(row.net_sales),
      },
    }
  })
  const operationsRows = (operationsResult.data ?? []) as DailyDetailOperationsRow[]
  const calculateTotals = (
    classes: DailyOperatingDetailData["studios"][number]["classes"],
    operationsRowsForStudio: DailyDetailOperationsRow[]
  ) => {
    const totals = classes.reduce(
    (sum, row) => ({
      classes: sum.classes + 1,
      seatsSold: sum.seatsSold + row.seatsSold,
      capacity: sum.capacity + row.capacity,
      netSales: sum.netSales + row.netSales,
    }),
    { classes: 0, seatsSold: 0, capacity: 0, netSales: 0 }
  )
    const leadTime = classes.reduce(
      (sum, row) => {
        if (row.leadTimeAverage === null || row.seatsSold <= 0) return sum
        return {
          weightedDays:
            sum.weightedDays + row.leadTimeAverage * row.seatsSold,
          seats: sum.seats + row.seatsSold,
        }
      },
      { weightedDays: 0, seats: 0 }
    )
    const operations = operationsRowsForStudio.reduce(
      (sum, row) => ({
        seatsSold: sum.seatsSold + numberValue(row.seats_sold),
        foodBeverageSales:
          sum.foodBeverageSales + numberValue(row.food_and_beverage_sales),
        totalSales: sum.totalSales + numberValue(row.total_sales),
      }),
      { seatsSold: 0, foodBeverageSales: 0, totalSales: 0 }
    )
    return {
      ...totals,
      percentFull: totals.capacity ? (totals.seatsSold / totals.capacity) * 100 : 0,
      averageLeadTime: leadTime.seats
        ? leadTime.weightedDays / leadTime.seats
        : null,
      foodBeverageSales: operations.foodBeverageSales,
      revenuePerSeat: operations.seatsSold
        ? operations.totalSales / operations.seatsSold
        : 0,
    }
  }
  const studios = (studioResult.data ?? []).map((studio) => {
    const classes = rows
      .filter((row) => row.studioId === studio.id)
      .map((row) => row.class)
    return {
      id: studio.id,
      name: studio.studio_name,
      totals: calculateTotals(
        classes,
        operationsRows.filter((row) => row.studio_id === studio.id)
      ),
      classes,
    }
  })
  const allClasses = studios.flatMap((studio) => studio.classes)

  return {
    date,
    totals: calculateTotals(allClasses, operationsRows),
    studios,
  }
}

async function getProductGroupSalesDetail(
  productGroup: string,
  unnamedItem: string,
  studioId: number | undefined,
  startDate: string,
  endDate: string
): Promise<CandleSalesDetailData> {
  let studiosQuery = supabase.from("studios").select("id,studio_name")

  if (studioId) {
    studiosQuery = studiosQuery.eq("id", studioId)
  }

  const [currentRows, historicalRows, studiosResult] = await Promise.all([
    getPagedProductRows(
      "pts_product_sales_reporting",
      startDate,
      endDate,
      studioId?.toString()
    ),
    getPagedProductRows(
      "pts_product_sales_daily_reporting",
      startDate,
      endDate,
      studioId?.toString()
    ),
    studiosQuery.order("studio_name"),
  ])
  if (studiosResult.error) throw studiosResult.error

  const currentStudioDates = new Set(
    currentRows.map((row) => `${row.studio_id}:${row.report_date}`)
  )
  const rows = [
    ...historicalRows.filter(
      (row) => !currentStudioDates.has(`${row.studio_id}:${row.report_date}`)
    ),
    ...currentRows,
  ].filter(
    (row) => {
      const label = [row.subcategory, row.item_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return (
        row.product_group === productGroup &&
        (numberValue(row.net_sales) !== 0 || !/pre[\s-]*order/.test(label))
      )
    }
  )
  const studios = (studiosResult.data ?? []).map((studio) => {
    const items = rows
      .filter((row) => row.studio_id === studio.id)
      .map((row) => ({
        date: row.report_date,
        name: row.item_name || unnamedItem,
        subcategory: row.subcategory || "—",
        quantity: numberValue(row.quantity),
        sales: numberValue(row.net_sales),
      }))
    return {
      id: studio.id,
      name: studio.studio_name,
      sales: items.reduce((sum, item) => sum + item.sales, 0),
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
    }
  })

  return {
    period: { startDate, endDate },
    totals: {
      sales: studios.reduce((sum, studio) => sum + studio.sales, 0),
      quantity: studios.reduce((sum, studio) => sum + studio.quantity, 0),
    },
    studios,
  }
}

export function getCandleSalesDetail(
  studioId: number | undefined,
  startDate: string,
  endDate: string
) {
  return getProductGroupSalesDetail(
    "Candles",
    "Unnamed candle",
    studioId,
    startDate,
    endDate
  )
}

export function getArtSuppliesSalesDetail(
  studioId: number | undefined,
  startDate: string,
  endDate: string
) {
  return getProductGroupSalesDetail(
    "Art Supplies",
    "Unnamed art supply",
    studioId,
    startDate,
    endDate
  )
}

export async function getClassEventSalesDetail(
  reportingClassType: "Private Party" | "Mobile Events",
  studioId: number | undefined,
  startDate: string,
  endDate: string
): Promise<ClassEventSalesDetailData> {
  let classesQuery = supabase
    .from("pts_class_sales_reporting")
    .select(
      "id,studio_id,event_date,painting,class_time,room,source_class_type,seats_sold,capacity,class_sales,fee_sales,net_sales"
    )
    .eq("reporting_class_type", reportingClassType)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date", { ascending: false })
    .range(0, 4999)
  let studiosQuery = supabase.from("studios").select("id,studio_name")

  if (studioId) {
    classesQuery = classesQuery.eq("studio_id", studioId)
    studiosQuery = studiosQuery.eq("id", studioId)
  }

  const [classesResult, studiosResult] = await Promise.all([
    classesQuery,
    studiosQuery.order("studio_name"),
  ])
  if (classesResult.error) throw classesResult.error
  if (studiosResult.error) throw studiosResult.error

  const rows = (classesResult.data ?? []) as ClassEventDetailRow[]
  const studios = (studiosResult.data ?? []).map((studio) => {
    const classes = rows
      .filter((row) => row.studio_id === studio.id)
      .map((row) => ({
        id: row.id,
        date: row.event_date,
        painting: row.painting || "Untitled event",
        classTime: row.class_time,
        room: row.room || "—",
        sourceClassType: row.source_class_type || reportingClassType,
        seatsSold: numberValue(row.seats_sold),
        capacity: numberValue(row.capacity),
        revenue: numberValue(row.class_sales) + numberValue(row.fee_sales),
      }))

    return {
      id: studio.id,
      name: studio.studio_name,
      events: classes.length,
      seatsSold: classes.reduce((sum, item) => sum + item.seatsSold, 0),
      revenue: classes.reduce((sum, item) => sum + item.revenue, 0),
      classes,
    }
  })

  return {
    period: { startDate, endDate },
    totals: {
      events: studios.reduce((sum, studio) => sum + studio.events, 0),
      seatsSold: studios.reduce((sum, studio) => sum + studio.seatsSold, 0),
      revenue: studios.reduce((sum, studio) => sum + studio.revenue, 0),
    },
    studios,
  }
}
