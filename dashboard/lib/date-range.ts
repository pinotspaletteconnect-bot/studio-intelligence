export type DateRangePreset =
  | "7d"
  | "30d"
  | "90d"
  | "lastWeek"
  | "mtd"
  | "lastMonth"
  | "custom"

export type AppliedDateRange = {
  preset: DateRangePreset
  startDate: string
  endDate: string
}

const presetDays = {
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

  let start = new Date(end)
  if (preset === "lastWeek") {
    const currentWeekMondayOffset = (today.getDay() + 6) % 7
    start = new Date(today)
    start.setHours(12, 0, 0, 0)
    start.setDate(today.getDate() - currentWeekMondayOffset - 7)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)
  } else if (preset === "mtd") {
    start = new Date(end.getFullYear(), end.getMonth(), 1, 12)
  } else if (preset === "lastMonth") {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1, 12)
    end.setTime(new Date(end.getFullYear(), end.getMonth(), 0, 12).getTime())
  } else {
    start.setDate(
      start.getDate() - (presetDays[preset as keyof typeof presetDays] - 1)
    )
  }

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
