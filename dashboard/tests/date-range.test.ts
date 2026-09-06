import { afterEach, expect, it, vi } from "vitest"
import { businessDate, getCompletedDateRange, resolveReportPeriod } from "@/lib/date-range"

afterEach(() => vi.useRealTimers())

it.each([
  ["2026-03-09T04:30:00Z", "2026-03-02", "2026-03-08"],
  ["2026-11-02T05:30:00Z", "2026-10-26", "2026-11-01"],
  ["2026-01-01T17:00:00Z", "2025-12-25", "2025-12-31"],
])("keeps seven completed calendar days across DST and year boundaries: %s", (now, start, end) => {
  expect(getCompletedDateRange("7d", new Date(now))).toMatchObject({ startDate: start, endDate: end })
})

it("uses the same completed Eastern day in browser and server near UTC midnight", () => {
  vi.useFakeTimers().setSystemTime(new Date("2026-08-02T02:00:00Z"))
  expect(businessDate()).toBe("2026-08-01")
  expect(resolveReportPeriod(undefined, undefined, 7)).toEqual({ periodStart: "2026-07-25", periodEnd: "2026-07-31" })
})

it("accepts one-day reports and rejects reversed or impossible dates", () => {
  expect(resolveReportPeriod("2026-08-01", "2026-08-01")).toEqual({ periodStart: "2026-08-01", periodEnd: "2026-08-01" })
  expect(() => resolveReportPeriod("2026-08-02", "2026-08-01")).toThrow()
  expect(() => resolveReportPeriod("2026-02-30", "2026-03-01")).toThrow()
})

it("keeps the production week and month presets at calendar boundaries", () => {
  const today = new Date("2026-09-01T12:00:00Z")
  expect(getCompletedDateRange("lastWeek", today)).toMatchObject({ startDate: "2026-08-24", endDate: "2026-08-30" })
  expect(getCompletedDateRange("lastMonth", today)).toMatchObject({ startDate: "2026-08-01", endDate: "2026-08-31" })
  expect(getCompletedDateRange("mtd", today)).toMatchObject({ startDate: "2026-08-01", endDate: "2026-08-31" })
})
