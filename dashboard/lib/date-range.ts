export type DateRangePreset = "7d" | "30d" | "90d" | "lastWeek" | "mtd" | "lastMonth" | "custom"

export type AppliedDateRange = {
  preset: DateRangePreset
  startDate: string
  endDate: string
}

const presetDays: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

export function businessDate(today = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(today).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function offsetDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function getCompletedDateRange(
  preset: Exclude<DateRangePreset, "custom">,
  today = new Date()
): AppliedDateRange {
  const current = businessDate(today)
  let end = offsetDate(current, -1)
  let start: string
  if (preset === "lastWeek") {
    const weekday = new Date(current + "T12:00:00Z").getUTCDay()
    start = offsetDate(current, -((weekday + 6) % 7) - 7)
    end = offsetDate(start, 6)
  } else if (preset === "mtd") {
    start = end.slice(0, 7) + "-01"
  } else if (preset === "lastMonth") {
    end = offsetDate(current.slice(0, 7) + "-01", -1)
    start = end.slice(0, 7) + "-01"
  } else {
    start = offsetDate(end, -(presetDays[preset] - 1))
  }

  return {
    preset,
    startDate: start,
    endDate: end,
  }
}

export class InvalidReportPeriodError extends Error {
  constructor() { super("Choose a valid date range with the start on or before the end.") }
}

export function resolveReportPeriod(start?: string, end?: string, days = 30) {
  const periodEnd = end ?? offsetDate(businessDate(), -1)
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  if (!validDate(periodEnd) || (start && !validDate(start))) throw new InvalidReportPeriodError()
  const periodStart = start ?? offsetDate(periodEnd, -(days - 1))
  if (periodStart > periodEnd) throw new InvalidReportPeriodError()
  return { periodStart, periodEnd }
}

export function formatAppliedDateRange(range: AppliedDateRange) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  return `${formatter.format(
    new Date(`${range.startDate}T00:00:00Z`)
  )} – ${formatter.format(new Date(`${range.endDate}T00:00:00Z`))}`
}
