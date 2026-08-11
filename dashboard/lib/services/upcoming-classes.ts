import { supabase } from "@/lib/supabase/server"
import {
  isMarketingPlaceholderClass,
  isZeroActivityPartyEvent,
} from "@/lib/services/pts-class-filters"

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

type ReservationBookingDailyRow = {
  studio_id: number
  order_date: string
  booking_line_count: number | string | null
  active_reservations: number | string | null
  refunded_reservations: number | string | null
  on_hold_reservations: number | string | null
  ordered_seats: number | string | null
  booked_sales: number | string | null
}

export type UpcomingClassesData = {
  snapshotDate: string | null
  bookingDate: string
  kpis: {
    upcomingClasses: number
    seatsSold: number
    seatsRemaining: number
    capacityPercent: number
    currentRevenue: number
    bookedSeats: number | null
    bookedSales: number | null
    activeBookedSeats: number | null
    refundedSeats: number | null
    heldSeats: number | null
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
      netSeatPickup: number | null
      netRevenuePickup: number | null
    }>
  }>
}

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function completedEasternDate() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  )
  const date = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
  )
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export async function getUpcomingClasses(
  studioId?: string,
  allowedStudioIds?: number[]
): Promise<UpcomingClassesData> {
  const bookingDate = completedEasternDate()
  let query = supabase
    .from("pts_upcoming_classes_current")
    .select(
      "studio_id,snapshot_date,event_date,source_event_key,painting,class_time,room,source_class_type,reporting_class_type,seats_sold,capacity,seats_remaining,capacity_percent,lead_time_average,class_sales,fee_sales,seats_pickup,revenue_pickup"
    )
    .order("class_time", { ascending: true })
    .range(0, 4999)

  if (studioId && studioId !== "all") query = query.eq("studio_id", studioId)
  else if (allowedStudioIds) query = query.in("studio_id", allowedStudioIds)

  let bookingQuery = supabase
    .from("pts_reservation_booking_daily")
    .select(
      "studio_id,order_date,booking_line_count,active_reservations,refunded_reservations,on_hold_reservations,ordered_seats,booked_sales"
    )
    .eq("order_date", bookingDate)
  if (studioId && studioId !== "all") {
    bookingQuery = bookingQuery.eq("studio_id", studioId)
  } else if (allowedStudioIds) {
    bookingQuery = bookingQuery.in("studio_id", allowedStudioIds)
  }

  const [{ data, error }, bookingResult] = await Promise.all([query, bookingQuery])
  if (error) throw error
  if (bookingResult.error) throw bookingResult.error

  const rows = ((data ?? []) as UpcomingClassRow[])
    .filter(
      (row) =>
        !isMarketingPlaceholderClass(row.painting) &&
        !isZeroActivityPartyEvent({
          classType: row.reporting_class_type,
          painting: row.painting,
          seatsSold: row.seats_sold,
          classSales: row.class_sales,
          feeSales: row.fee_sales,
        })
    )
  const bookingRows = (bookingResult.data ?? []) as ReservationBookingDailyRow[]
  const studioIds = [
    ...new Set([
      ...rows.map((row) => row.studio_id),
      ...bookingRows.map((row) => row.studio_id),
    ]),
  ]
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
    netSeatPickup:
      row.seats_pickup === null ? null : numberValue(row.seats_pickup),
    netRevenuePickup:
      row.revenue_pickup === null ? null : numberValue(row.revenue_pickup),
  }))
  const totals = classes.reduce(
    (sum, row) => ({
      seatsSold: sum.seatsSold + row.seatsSold,
      capacity: sum.capacity + row.capacity,
      seatsRemaining: sum.seatsRemaining + row.seatsRemaining,
      revenue: sum.revenue + row.revenue,
    }),
    { seatsSold: 0, capacity: 0, seatsRemaining: 0, revenue: 0 }
  )
  const bookingTotals = bookingRows.reduce(
    (sum, row) => ({
      bookedSeats: sum.bookedSeats + numberValue(row.ordered_seats),
      bookedSales: sum.bookedSales + numberValue(row.booked_sales),
      activeBookedSeats:
        sum.activeBookedSeats + numberValue(row.active_reservations),
      refundedSeats: sum.refundedSeats + numberValue(row.refunded_reservations),
      heldSeats: sum.heldSeats + numberValue(row.on_hold_reservations),
    }),
    {
      bookedSeats: 0,
      bookedSales: 0,
      activeBookedSeats: 0,
      refundedSeats: 0,
      heldSeats: 0,
    }
  )
  const hasBookings = bookingRows.length > 0

  return {
    snapshotDate: rows[0]?.snapshot_date ?? null,
    bookingDate,
    kpis: {
      upcomingClasses: classes.length,
      seatsSold: totals.seatsSold,
      seatsRemaining: totals.seatsRemaining,
      capacityPercent: totals.capacity ? (totals.seatsSold / totals.capacity) * 100 : 0,
      currentRevenue: totals.revenue,
      bookedSeats: hasBookings ? bookingTotals.bookedSeats : null,
      bookedSales: hasBookings ? bookingTotals.bookedSales : null,
      activeBookedSeats: hasBookings ? bookingTotals.activeBookedSeats : null,
      refundedSeats: hasBookings ? bookingTotals.refundedSeats : null,
      heldSeats: hasBookings ? bookingTotals.heldSeats : null,
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
