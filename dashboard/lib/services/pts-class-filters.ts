const MARKETING_PLACEHOLDER_PREFIX = /^\s*available\s+for\b/i

export function isMarketingPlaceholderClass(painting: string | null | undefined) {
  return MARKETING_PLACEHOLDER_PREFIX.test(painting ?? "")
}

export function isBeforeOpeningClassTime(
  classTime: string | null | undefined,
  timeZone: string | null | undefined
) {
  if (!classTime || !timeZone) return false
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(classTime)).find((part) => part.type === "hour")?.value
  return hour !== undefined && Number(hour) < 4
}

export function isReportablePtsClass(
  row: { painting?: string | null; class_time?: string | null },
  timeZone: string | null | undefined
) {
  return !isMarketingPlaceholderClass(row.painting) &&
    !isBeforeOpeningClassTime(row.class_time, timeZone)
}

export function hasHistoricalPartyEvidence(row: {
  painting?: string | null
  reporting_class_type?: string | null
  seats_sold?: number | string | null
  capacity?: number | string | null
  class_sales?: number | string | null
  fee_sales?: number | string | null
}) {
  if (row.reporting_class_type !== "Private Party" && row.reporting_class_type !== "Mobile Events") {
    return true
  }
  if (!/^\s*no\s+painting\s+selected\s*$/i.test(row.painting ?? "")) return true

  return [row.seats_sold, row.capacity, row.class_sales, row.fee_sales]
    .some((value) => Number(value ?? 0) !== 0)
}
