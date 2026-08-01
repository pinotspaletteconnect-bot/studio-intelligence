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

type ClassLeadTimeRow = {
  seats_sold: number | string | null
  lead_time_average: number | string | null
}

export type OperationsDashboardData = {
  period: { startDate: string; endDate: string; days: number }
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

type CandleDetailRow = {
  studio_id: number
  report_date: string
  item_name: string | null
  subcategory: string | null
  quantity: number | string | null
  net_sales: number | string | null
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
  const foodBeverageQuery = addStudioFilter(
    supabase
      .from("pts_product_sales_daily_reporting")
      .select(
        "report_date,product_group,department,subcategory,item_name,quantity,net_sales"
      )
      .eq("department", "Food & Beverage")
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
  const candlesQuery = addStudioFilter(
    supabase
      .from("pts_product_sales_daily_reporting")
      .select("report_date,product_group,department,subcategory,item_name,quantity,net_sales")
      .eq("product_group", "Candles")
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const foodQuery = addStudioFilter(
    supabase
      .from("pts_product_sales_daily_reporting")
      .select(
        "report_date,product_group,department,subcategory,item_name,quantity,net_sales"
      )
      .eq("product_group", "Food")
      .gte("report_date", periodStart)
      .lte("report_date", periodEnd),
    studioId
  )
  const artSuppliesQuery = addStudioFilter(
    supabase
      .from("pts_product_sales_daily_reporting")
      .select(
        "report_date,product_group,department,subcategory,item_name,quantity,net_sales"
      )
      .eq("product_group", "Art Supplies")
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
    dailyResult,
    foodBeverageResult,
    candlesResult,
    foodResult,
    artSuppliesResult,
    classTypesResult,
    classLeadTimeResult,
  ] =
    await Promise.all([
      dailyQuery.order("report_date").range(0, 4999),
      foodBeverageQuery.order("report_date").range(0, 9999),
      candlesQuery.order("report_date").range(0, 4999),
      foodQuery.order("report_date").range(0, 4999),
      artSuppliesQuery.order("report_date").range(0, 4999),
      classTypesQuery.order("report_date").range(0, 4999),
      classLeadTimeQuery.range(0, 4999),
    ])

  if (dailyResult.error) throw dailyResult.error
  if (foodBeverageResult.error) throw foodBeverageResult.error
  if (candlesResult.error) throw candlesResult.error
  if (foodResult.error) throw foodResult.error
  if (artSuppliesResult.error) throw artSuppliesResult.error
  if (classTypesResult.error) throw classTypesResult.error
  if (classLeadTimeResult.error) throw classLeadTimeResult.error

  const dailyRows = (dailyResult.data ?? []) as DailyOperationsRow[]
  const productRows = ((foodBeverageResult.data ?? []) as ProductRow[]).filter(
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

      return numberValue(row.net_sales) !== 0 || !isPreorderPlaceholder
    }
  )
  const candleRows = ((candlesResult.data ?? []) as ProductRow[]).filter(
    (row) => {
      const productLabel = [row.subcategory, row.item_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return (
        numberValue(row.net_sales) !== 0 ||
        !/pre[\s-]*order/.test(productLabel)
      )
    }
  )
  const foodRows = ((foodResult.data ?? []) as ProductRow[]).filter((row) => {
    const label = [row.subcategory, row.item_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return numberValue(row.net_sales) !== 0 || !/pre[\s-]*order/.test(label)
  })
  const artSuppliesRows = (artSuppliesResult.data ?? []) as ProductRow[]
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
  const studioFoodBeverageMap = new Map<
    number,
    { foodBeverageSales: number; totalSales: number }
  >()

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

    const studioFoodBeverage = studioFoodBeverageMap.get(row.studio_id) ?? {
      foodBeverageSales: 0,
      totalSales: 0,
    }
    studioFoodBeverage.foodBeverageSales += numberValue(
      row.food_and_beverage_sales
    )
    studioFoodBeverage.totalSales += numberValue(row.total_sales)
    studioFoodBeverageMap.set(row.studio_id, studioFoodBeverage)
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
    group.events += numberValue(row.class_event_count)
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

      return {
        studioId: currentStudioId,
        studioName:
          studioNames.get(currentStudioId) ?? `Studio ${currentStudioId}`,
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
    .from("pts_operations_daily")
    .select("studio_id,seats_sold,food_and_beverage_sales,total_sales")
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
  let productsQuery = supabase
    .from("pts_product_sales_daily_reporting")
    .select("studio_id,report_date,item_name,subcategory,quantity,net_sales")
    .eq("product_group", productGroup)
    .gte("report_date", startDate)
    .lte("report_date", endDate)
    .order("report_date", { ascending: false })
    .range(0, 4999)
  let studiosQuery = supabase.from("studios").select("id,studio_name")

  if (studioId) {
    productsQuery = productsQuery.eq("studio_id", studioId)
    studiosQuery = studiosQuery.eq("id", studioId)
  }

  const [productsResult, studiosResult] = await Promise.all([
    productsQuery,
    studiosQuery.order("studio_name"),
  ])
  if (productsResult.error) throw productsResult.error
  if (studiosResult.error) throw studiosResult.error

  const rows = ((productsResult.data ?? []) as CandleDetailRow[]).filter(
    (row) => {
      const label = [row.subcategory, row.item_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return numberValue(row.net_sales) !== 0 || !/pre[\s-]*order/.test(label)
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
