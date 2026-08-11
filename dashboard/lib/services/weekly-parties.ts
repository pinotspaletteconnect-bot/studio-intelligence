import { getClassEventSalesDetail } from "@/lib/services/operations"
import { getUpcomingClasses } from "@/lib/services/upcoming-classes"

export type WeeklyPartiesData = {
  period: { startDate: string; endDate: string; completedThrough: string | null }
  snapshotDate: string | null
  totals: { events: number; privateParties: number; mobileEvents: number; seatsSold: number; revenue: number }
  studios: Array<{
    id: number
    name: string
    events: Array<{
      id: string
      date: string
      classTime: string | null
      displayName: string | null
      name: string
      type: "Private Party" | "Mobile Events"
      status: "Completed" | "Upcoming"
      room: string
      seatsSold: number
      capacity: number
      revenue: number
    }>
  }>
}

const shiftIsoDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function easternToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export async function getWeeklyParties(studioId?: string, allowedStudioIds?: number[]): Promise<WeeklyPartiesData> {
  const today = easternToday()
  const todayDate = new Date(`${today}T00:00:00Z`)
  const weekStart = shiftIsoDate(today, -((todayDate.getUTCDay() + 6) % 7))
  const weekEnd = shiftIsoDate(weekStart, 6)
  const yesterday = shiftIsoDate(today, -1)
  const completedThrough = yesterday >= weekStart ? yesterday : null
  const numericStudioId = studioId && studioId !== "all" ? Number(studioId) : undefined

  const [privateCompleted, mobileCompleted, upcoming] = await Promise.all([
    completedThrough ? getClassEventSalesDetail("Private Party", numericStudioId, weekStart, completedThrough, allowedStudioIds) : null,
    completedThrough ? getClassEventSalesDetail("Mobile Events", numericStudioId, weekStart, completedThrough, allowedStudioIds) : null,
    getUpcomingClasses(studioId, allowedStudioIds),
  ])

  const studioMap = new Map<number, WeeklyPartiesData["studios"][number]>()
  const ensureStudio = (id: number, name: string) => {
    const current = studioMap.get(id) ?? { id, name, events: [] }
    studioMap.set(id, current)
    return current
  }

  for (const [detail, type] of [[privateCompleted, "Private Party"], [mobileCompleted, "Mobile Events"]] as const) {
    for (const studio of detail?.studios ?? []) {
      const target = ensureStudio(studio.id, studio.name)
      for (const event of studio.classes) target.events.push({
        id: `completed-${type}-${event.id}`,
        date: event.date,
        classTime: event.classTime,
        displayName: null,
        name: event.painting,
        type,
        status: "Completed",
        room: event.room,
        seatsSold: event.seatsSold,
        capacity: event.capacity,
        revenue: event.revenue,
      })
    }
  }

  for (const studio of upcoming.studios) {
    for (const event of studio.classes.filter((item) => item.eventDate >= today && item.eventDate <= weekEnd && (item.classType === "Private Party" || item.classType === "Mobile Events"))) {
      ensureStudio(studio.id, studio.name).events.push({
        id: `upcoming-${event.eventKey}`,
        date: event.eventDate,
        classTime: event.classTime,
        displayName: event.displayName,
        name: event.painting,
        type: event.classType as "Private Party" | "Mobile Events",
        status: "Upcoming",
        room: event.room,
        seatsSold: event.seatsSold,
        capacity: event.capacity,
        revenue: event.revenue,
      })
    }
  }

  const studios = [...studioMap.values()].map((studio) => ({
    ...studio,
    events: studio.events.sort((a, b) => (a.classTime ?? a.date).localeCompare(b.classTime ?? b.date)),
  })).filter((studio) => studio.events.length).sort((a, b) => a.name.localeCompare(b.name))
  const events = studios.flatMap((studio) => studio.events)
  return {
    period: { startDate: weekStart, endDate: weekEnd, completedThrough },
    snapshotDate: upcoming.snapshotDate,
    totals: {
      events: events.length,
      privateParties: events.filter((event) => event.type === "Private Party").length,
      mobileEvents: events.filter((event) => event.type === "Mobile Events").length,
      seatsSold: events.reduce((sum, event) => sum + event.seatsSold, 0),
      revenue: events.reduce((sum, event) => sum + event.revenue, 0),
    },
    studios,
  }
}
