export const channelKeys = ["social", "search", "display", "video", "other"] as const
type Channel = typeof channelKeys[number]
type Value = number | string | null
export type EulerityComparisonRow = {
  studio_id: number | string
  report_date: string
} & Partial<Record<`${"spend" | "clicks" | "impressions"}_${Channel | "total"}`, Value>>
type Studio = { id: number | string; studio_name: string }
export type EulerityAttributionRow = { studio_id: number | string; report_date: string; total_revenue: Value }

const number = (value: Value | undefined) => value == null || !Number.isFinite(Number(value)) ? null : Number(value)

export function buildEulerityComparison(studios: Studio[], rows: EulerityComparisonRow[], days: number, attribution: EulerityAttributionRow[] = []) {
  const result = studios.map((studio) => {
    const records = rows.filter((row) => String(row.studio_id) === String(studio.id))
    const daysWithData = new Set(records.map((row) => row.report_date)).size
    const metrics = (key: Channel | "total") => {
      const sum = (field: "spend" | "clicks" | "impressions") => {
        const values = records.map((row) => number(row[`${field}_${key}`]))
        return !values.length || values.some((value) => value === null) ? null : values.reduce<number>((a, b) => a + (b ?? 0), 0)
      }
      const spend = sum("spend"), clicks = sum("clicks"), impressions = sum("impressions")
      return { spend, clicks, impressions,
        cpc: spend !== null && clicks !== null && clicks > 0 ? spend / clicks : null,
        ctr: clicks !== null && impressions !== null && impressions > 0 ? clicks / impressions * 100 : null,
      }
    }
    const total = metrics("total")
    const revenues = attribution.filter((row) => String(row.studio_id) === String(studio.id)).map((row) => number(row.total_revenue))
    const attributedRevenue = !revenues.length || revenues.some((value) => value === null) ? null : revenues.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    const attributedRoas = attributedRevenue !== null && total.spend !== null && total.spend > 0 && daysWithData === days ? attributedRevenue / total.spend : null
    return { id: String(studio.id), name: studio.studio_name, daysWithData, total: { ...total, attributedRevenue, attributedRoas },
      channels: channelKeys.map((key) => {
        const values = metrics(key)
        return { key, ...values, spendShare: values.spend !== null && total.spend !== null && total.spend > 0 ? values.spend / total.spend * 100 : null }
      }),
    }
  })
  return { days, studios: result.map((studio) => ({ ...studio,
    channels: studio.channels.map((channel) => {
      // Compare complete periods only; exclude the current studio and zero-click peers.
      const peers = result.filter((peer) => peer.id !== studio.id && peer.daysWithData === days)
        .flatMap((peer) => peer.channels.filter((item) => item.key === channel.key && item.cpc !== null))
      const peerClicks = peers.reduce((sum, peer) => sum + (peer.clicks ?? 0), 0)
      const peerCpc = studio.daysWithData === days && peerClicks > 0
        ? peers.reduce((sum, peer) => sum + (peer.spend ?? 0), 0) / peerClicks : null
      return { ...channel, peerCpc, difference: channel.cpc !== null && peerCpc !== null && peerCpc > 0 ? (channel.cpc / peerCpc - 1) * 100 : null }
    }),
  })) }
}

export type EulerityComparison = ReturnType<typeof buildEulerityComparison>
