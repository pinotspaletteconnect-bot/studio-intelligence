import "server-only"

import { supabase } from "@/lib/supabase/server"

export type UploadFreshness = "current" | "partial" | "overdue" | "missing" | "error"

export type UploadStudioStatus = {
  id: number
  name: string
  hasRows: boolean
  rowCount: number
  lastReceivedAt: string | null
}

export type UploadFeedStatus = {
  key: string
  name: string
  description: string
  expectedDate: string
  latestBusinessDate: string | null
  lastReceivedAt: string | null
  rowCount: number
  representedStudios: number
  totalStudios: number
  freshness: UploadFreshness
  studios: UploadStudioStatus[]
}

type FeedDefinition = {
  key: string
  name: string
  description: string
  table: string
  dateColumn: string
  expectedDate: (today: string, yesterday: string) => string
}

const feedDefinitions: FeedDefinition[] = [
  {
    key: "daily-sales",
    name: "Daily Sales",
    description: "Completed sales, seats, attendance, and daily operating totals.",
    table: "pts_sales_daily_summary",
    dateColumn: "report_date",
    expectedDate: (_today, yesterday) => yesterday,
  },
  {
    key: "product-sales",
    name: "Product Sales",
    description: "Food, beverage, candle, art supply, and merchandise line items.",
    table: "pts_non_class_sales_items",
    dateColumn: "report_date",
    expectedDate: (_today, yesterday) => yesterday,
  },
  {
    key: "class-sales",
    name: "Class Sales",
    description: "Completed class-level seats, capacity, revenue, and class type facts.",
    table: "pts_class_sales_daily",
    dateColumn: "report_date",
    expectedDate: (_today, yesterday) => yesterday,
  },
  {
    key: "upcoming-classes",
    name: "Upcoming Classes",
    description: "Daily future-class capacity and booked-revenue snapshot.",
    table: "pts_upcoming_class_snapshots",
    dateColumn: "snapshot_date",
    expectedDate: today => today,
  },
  {
    key: "reservations",
    name: "Reservations",
    description: "Prior-day booked seats and gross booking-line sales.",
    table: "pts_reservation_bookings",
    dateColumn: "order_date",
    expectedDate: (_today, yesterday) => yesterday,
  },
]

function easternDate(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  )
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

export function classifyUploadFreshness(
  latestBusinessDate: string | null,
  expectedDate: string,
  representedStudios: number,
  totalStudios: number
): UploadFreshness {
  if (!latestBusinessDate) return "missing"
  if (latestBusinessDate < expectedDate) return "overdue"
  if (representedStudios < totalStudios) return "partial"
  return "current"
}

async function loadFeedStatus(
  definition: FeedDefinition,
  organizationId: number,
  studios: Array<{ id: number; studio_name: string }>,
  today: string,
  yesterday: string
): Promise<UploadFeedStatus> {
  const studioIds = studios.map(studio => studio.id)
  const expectedDate = definition.expectedDate(today, yesterday)
  const latestResult = await supabase
    .from(definition.table)
    .select(`${definition.dateColumn},retrieved_at`)
    .eq("organization_id", organizationId)
    .in("studio_id", studioIds)
    .order(definition.dateColumn, { ascending: false })
    .order("retrieved_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestResult.error) throw latestResult.error

  const latestRow = latestResult.data as Record<string, unknown> | null
  const latestDateValue = latestRow?.[definition.dateColumn]
  const latestBusinessDate =
    typeof latestDateValue === "string" ? latestDateValue : null

  if (!latestBusinessDate) {
    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      expectedDate,
      latestBusinessDate: null,
      lastReceivedAt: null,
      rowCount: 0,
      representedStudios: 0,
      totalStudios: studios.length,
      freshness: "missing",
      studios: studios.map(studio => ({
        id: studio.id,
        name: studio.studio_name,
        hasRows: false,
        rowCount: 0,
        lastReceivedAt: null,
      })),
    }
  }

  const sliceResult = await supabase
    .from(definition.table)
    .select("studio_id,retrieved_at")
    .eq("organization_id", organizationId)
    .in("studio_id", studioIds)
    .eq(definition.dateColumn, latestBusinessDate)
    .range(0, 9999)

  if (sliceResult.error) throw sliceResult.error

  const counts = new Map<number, { rowCount: number; lastReceivedAt: string | null }>()
  for (const row of sliceResult.data ?? []) {
    const current = counts.get(row.studio_id) ?? { rowCount: 0, lastReceivedAt: null }
    const receivedAt = typeof row.retrieved_at === "string" ? row.retrieved_at : null
    counts.set(row.studio_id, {
      rowCount: current.rowCount + 1,
      lastReceivedAt:
        receivedAt && (!current.lastReceivedAt || receivedAt > current.lastReceivedAt)
          ? receivedAt
          : current.lastReceivedAt,
    })
  }

  const studioStatuses = studios.map(studio => {
    const status = counts.get(studio.id)
    return {
      id: studio.id,
      name: studio.studio_name,
      hasRows: Boolean(status),
      rowCount: status?.rowCount ?? 0,
      lastReceivedAt: status?.lastReceivedAt ?? null,
    }
  })
  const receivedTimes = studioStatuses
    .map(studio => studio.lastReceivedAt)
    .filter((value): value is string => Boolean(value))
  const representedStudios = studioStatuses.filter(studio => studio.hasRows).length

  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    expectedDate,
    latestBusinessDate,
    lastReceivedAt: receivedTimes.sort().at(-1) ?? null,
    rowCount: studioStatuses.reduce((total, studio) => total + studio.rowCount, 0),
    representedStudios,
    totalStudios: studios.length,
    freshness: classifyUploadFreshness(
      latestBusinessDate,
      expectedDate,
      representedStudios,
      studios.length
    ),
    studios: studioStatuses,
  }
}

export async function getDataUploadStatus(
  organizationId: number,
  allowedStudioIds: number[]
) {
  if (allowedStudioIds.length === 0) {
    return { checkedAt: new Date().toISOString(), feeds: [] as UploadFeedStatus[] }
  }

  const studiosResult = await supabase
    .from("studios")
    .select("id,studio_name")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("id", allowedStudioIds)
    .order("studio_name")

  if (studiosResult.error) throw studiosResult.error

  const today = easternDate()
  const yesterday = easternDate(-1)
  const feeds = await Promise.all(
    feedDefinitions.map(definition =>
      loadFeedStatus(
        definition,
        organizationId,
        studiosResult.data ?? [],
        today,
        yesterday
      ).catch(error => {
        console.error("Unable to load data upload status", {
          feed: definition.key,
          organizationId,
          error,
        })
        return {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          expectedDate: definition.expectedDate(today, yesterday),
          latestBusinessDate: null,
          lastReceivedAt: null,
          rowCount: 0,
          representedStudios: 0,
          totalStudios: studiosResult.data?.length ?? 0,
          freshness: "error" as const,
          studios: (studiosResult.data ?? []).map(studio => ({
            id: studio.id,
            name: studio.studio_name,
            hasRows: false,
            rowCount: 0,
            lastReceivedAt: null,
          })),
        }
      })
    )
  )

  return { checkedAt: new Date().toISOString(), feeds }
}
