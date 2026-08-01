import { supabase } from "@/lib/supabase/server"

type UpcomingClassRow = {
  studio_id: number
  snapshot_date: string
  event_date: string
  source_event_key: string
  painting: string | null
  class_time: string | null
  room: string | null
  source_class_type: string | null
  reporting_class_type: string
  seats_sold: number | string | null
  capacity: number | string | null
  seats_remaining: number | string | null
  capacity_percent: number | string | null
  lead_time_average: number | string | null
  class_sales: number | string | null
  fee_sales: number | string | null
  seats_pickup: number | string | null
  revenue_pickup: number | string | null
}

export type UpcomingClassesData = {
  snapshotDate: string | null
  kpis: {
    upcomingClasses: number
    seatsSold: number
    seatsRemaining: number
    capacityPercent: number
    currentRevenue: number
    yesterdaySeats: number | null
    yesterdayRevenue: number | null
  }
  studios: Array<{
    id: number
    name: string
    classes: Array<{
      eventKey: string
      eventDate: string
      classTime: string | null
      painting: string
      room: string
      classType: string
      seatsSold: number
      capacity: number
      seatsRemaining: number
      capacityPercent: number
      leadTimeAverage: number | null
      revenue: number
      yesterdaySeats: number | null
      yesterdayRevenue: number | null
    }>
  }>
}

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getUpcomingClasses(
  studioId?: string
): Promise<UpcomingClassesData> {
  let query = supabase
    .from("pts_upcoming_classes_current")
    .select(
      "studio_id,snapshot_date,event_date,source_event_key,painting,class_time,room,source_class_type,reporting_class_type,seats_sold,capacity,seats_remaining,capacity_percent,lead_time_average,class_sales,fee_sales,seats_pickup,revenue_pickup"
    )
    .order("class_time", { ascending: true })
    .range(0, 4999)

  if (studioId && studioId !== "all") query = query.eq("studio_id", studioId)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as UpcomingClassRow[]
  const studioIds = [...new Set(rows.map((row) => row.studio_id))]
  const studioNames = new Map<number, string>()
  if (studioIds.length) {
    const studiosResult = await supabase
      .from("studios")
      .select("id,studio_name")
      .in("id", studioIds)
    if (studiosResult.error) throw studiosResult.error
    for (const studio of studiosResult.data ?? []) {
      studioNames.set(studio.id, studio.studio_name)
    }
  }

  const classes = rows.map((row) => ({
    studioId: row.studio_id,
    eventKey: row.source_event_key,
    eventDate: row.event_date,
    classTime: row.class_time,
    painting: row.painting || "Untitled class",
    room: row.room || "—",
    classType: row.reporting_class_type || row.source_class_type || "Unspecified",
    seatsSold: numberValue(row.seats_sold),
    capacity: numberValue(row.capacity),
    seatsRemaining: numberValue(row.seats_remaining),
    capacityPercent: numberValue(row.capacity_percent),
    leadTimeAverage:
      row.lead_time_average === null ? null : numberValue(row.lead_time_average),
    revenue: numberValue(row.class_sales) + numberValue(row.fee_sales),
    yesterdaySeats:
      row.seats_pickup === null ? null : numberValue(row.seats_pickup),
    yesterdayRevenue:
      row.revenue_pickup === null ? null : numberValue(row.revenue_pickup),
  }))
  const totals = classes.reduce(
    (sum, row) => ({
      seatsSold: sum.seatsSold + row.seatsSold,
      capacity: sum.capacity + row.capacity,
      seatsRemaining: sum.seatsRemaining + row.seatsRemaining,
      revenue: sum.revenue + row.revenue,
      yesterdaySeats:
        sum.yesterdaySeats + (row.yesterdaySeats === null ? 0 : row.yesterdaySeats),
      yesterdayRevenue:
        sum.yesterdayRevenue +
        (row.yesterdayRevenue === null ? 0 : row.yesterdayRevenue),
    }),
    { seatsSold: 0, capacity: 0, seatsRemaining: 0, revenue: 0, yesterdaySeats: 0, yesterdayRevenue: 0 }
  )
  const hasPickup = classes.some((row) => row.yesterdaySeats !== null)

  return {
    snapshotDate: rows[0]?.snapshot_date ?? null,
    kpis: {
      upcomingClasses: classes.length,
      seatsSold: totals.seatsSold,
      seatsRemaining: totals.seatsRemaining,
      capacityPercent: totals.capacity ? (totals.seatsSold / totals.capacity) * 100 : 0,
      currentRevenue: totals.revenue,
      yesterdaySeats: hasPickup ? totals.yesterdaySeats : null,
      yesterdayRevenue: hasPickup ? totals.yesterdayRevenue : null,
    },
    studios: studioIds
      .map((id) => ({
        id,
        name: studioNames.get(id) ?? `Studio ${id}`,
        classes: classes.filter((row) => row.studioId === id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}
