export type DateRangePreset = "7d" | "30d" | "90d" | "custom"

export type AppliedDateRange = {
  preset: DateRangePreset
  startDate: string
  endDate: string
}

const presetDays: Record<Exclude<DateRangePreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getCompletedDateRange(
  preset: Exclude<DateRangePreset, "custom">,
  today = new Date()
): AppliedDateRange {
  const end = new Date(today)
  end.setHours(12, 0, 0, 0)
  end.setDate(end.getDate() - 1)

  const start = new Date(end)
  start.setDate(start.getDate() - (presetDays[preset] - 1))

  return {
    preset,
    startDate: toLocalDateString(start),
    endDate: toLocalDateString(end),
  }
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
