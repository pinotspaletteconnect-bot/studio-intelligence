import { expect, it } from "vitest"
import { getCompletedDateRange } from "@/lib/date-range"

it.skipIf(process.env.SI_VERIFY_LIVE !== "1")("reconciles Eulerity comparison with the existing marketing report", async () => {
  const { supabase } = await import("@/lib/supabase/server")
  const { getMarketingDashboard } = await import("@/lib/services/marketing")
  const { getEulerityComparison } = await import("@/lib/services/eulerity")
  const studios = await supabase.from("studios").select("id").eq("active", true)
  expect(studios.error).toBeNull()
  const ids = studios.data!.map((studio) => Number(studio.id))
  const { startDate, endDate } = getCompletedDateRange("30d")
  const [comparison, existing] = await Promise.all([
    getEulerityComparison(startDate, endDate, ids),
    getMarketingDashboard("all", startDate, endDate, ids),
  ])
  expect(comparison.studios.map((studio) => Number(studio.id)).sort()).toEqual(ids.sort())
  expect(comparison.studios.reduce((sum, studio) => sum + (studio.total.spend ?? 0), 0))
    .toBeCloseTo(existing.channels.find((channel) => channel.key === "eulerity")!.spend, 2)
  expect(comparison.studios.reduce((sum, studio) => sum + (studio.total.attributedRevenue ?? 0), 0))
    .toBeCloseTo(existing.channels.find((channel) => channel.key === "eulerity")!.attributedRevenue, 2)
  for (const channel of existing.eulerityChannels) {
    expect(comparison.studios.reduce((sum, studio) => sum + (studio.channels.find((item) => item.key === channel.key)!.spend ?? 0), 0)).toBeCloseTo(channel.spend, 2)
  }
  console.log(JSON.stringify({ startDate, endDate, studios: comparison.studios.map((studio) => ({ name: studio.name, days: studio.daysWithData, spend: studio.total.spend })) }))
}, 60_000)
