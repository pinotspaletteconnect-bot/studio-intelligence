"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useApp } from "@/contexts/app-context"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { channelKeys, type EulerityComparison } from "@/lib/services/eulerity-comparison"

const money = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
const count = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US")
const percent = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`

export function EulerityDashboard() {
  const { dateRange } = useApp()
  const [response, setResponse] = useState<{ key: string; data?: EulerityComparison; error?: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const key = `${dateRange.startDate}/${dateRange.endDate}/${retry}`
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate })
    fetch(`/api/marketing/eulerity?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "Unable to load Eulerity data.")
        if (!controller.signal.aborted) setResponse({ key, data: body })
      }).catch((error: Error) => {
        if (!controller.signal.aborted) setResponse({ key, error: error.message })
      })
    return () => controller.abort()
  }, [dateRange.startDate, dateRange.endDate, key])
  const current = response?.key === key ? response : null
  const data = current?.data

  return <div className="flex flex-col gap-4 p-4 md:p-6">
    <DashboardToolbar title="Eulerity · costs & results" subtitle="Compare every studio, channel by channel, for the same dates." allStudios />
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted-foreground">Cost per click (CPC) highlights show higher or lower costs than your other studios.</p>
      <Link href="/marketing" className="font-medium text-primary hover:underline">← Marketing overview</Link>
    </div>
    {!current && <Card><CardContent className="py-12 text-center" role="status">Loading studio comparison…</CardContent></Card>}
    {current?.error && <Card><CardContent className="space-y-3 py-8" role="alert"><p>{current.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Try again</Button></CardContent></Card>}
    {data && data.studios.length === 0 && <p>No studios are available for this comparison.</p>}
    {data && data.studios.length > 0 && <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto" role="region" aria-label="Eulerity studio comparison" tabIndex={0}>
        <table className="w-full table-fixed text-sm" style={{ minWidth: 160 + data.studios.length * 205 }}>
          <caption className="sr-only">Eulerity channel costs and results by studio. CPC comparisons use other studios with complete date coverage.</caption>
          <thead><tr className="border-b bg-muted/40">
            <th scope="col" className="w-36 p-4 text-left">Channel</th>
            {data.studios.map((studio) => <th scope="col" key={studio.id} className="border-l p-4 text-left">
              <div className="font-semibold">{studio.name}</div>
              <div className={`mt-1 text-xs font-normal ${studio.daysWithData < data.days ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                {studio.daysWithData === 0 ? "No data for these dates" : `${studio.daysWithData} of ${data.days} days reported`}
              </div>
            </th>)}
          </tr></thead>
          <tbody>
            <tr className="border-b bg-muted/20">
              <th scope="row" className="p-4 text-left align-top">Eulerity total</th>
              {data.studios.map((studio) => <td key={studio.id} className="border-l p-4 align-top">
                <p className="text-xl font-semibold tabular-nums">{money(studio.total.spend)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{count(studio.total.clicks)} clicks · {money(studio.total.cpc)} CPC</p>
                <p className="mt-1 text-xs text-muted-foreground">{count(studio.total.impressions)} impressions · {percent(studio.total.ctr)} CTR</p>
              </td>)}
            </tr>
            {channelKeys.map((channelKey, index) => <tr key={channelKey} className="border-b last:border-b-0">
              <th scope="row" className="p-4 text-left align-top capitalize">{channelKey}</th>
              {data.studios.map((studio) => {
                const channel = studio.channels[index]
                const difference = channel.difference
                return <td key={studio.id} className="border-l px-4 py-3 align-top tabular-nums">
                  <div className="flex flex-wrap items-baseline justify-between gap-1"><span className="font-semibold">{money(channel.cpc)} <span className="text-xs font-normal text-muted-foreground">/ click</span></span><span className="text-xs">{money(channel.spend)} spend</span></div>
                  <p className={`mt-1 text-xs font-medium ${difference === null || Math.abs(difference) < 0.5 ? "text-muted-foreground" : difference > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {difference === null ? channel.clicks === 0 && (channel.spend ?? 0) > 0 ? "Spend with no clicks" : "Comparison unavailable" : Math.abs(difference) < 0.5 ? "In line with other studios" : `${Math.abs(difference).toFixed(0)}% ${difference > 0 ? "higher" : "lower"} than other studios`}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{count(channel.clicks)} clicks</span><span>{percent(channel.ctr)} CTR</span>
                    <span>{count(channel.impressions)} impressions</span><span>{percent(channel.spendShare)} of spend</span>
                  </div>
                </td>
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 border-t bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <p>Comparison = other studios’ combined spend ÷ combined clicks for the same channel. Only complete periods with known spend and positive clicks are compared. This is a peer reference, not an agreed cost target.</p>
        <p>Channel spend is allocated from Eulerity totals. CPC and click-through rate (CTR) use period totals. A dash means unavailable; missing days are not treated as zero. Results here are ad clicks and impressions, not bookings or revenue.</p>
      </div>
    </Card>}
  </div>
}
