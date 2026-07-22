"use client"

import { useEffect, useState } from "react"

import { MetricCard } from "@/components/studio/shared/metric-card"
import { useApp } from "@/contexts/app-context"

export function MarketingKPIs() {
  const app = useApp()

  const { selectedStudio } = app

  const [dashboard, setDashboard] = useState<any>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch(
          `/api/marketing/summary?studioId=${selectedStudio}`
        )

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const data = await res.json()

                setDashboard(data)
      } catch (err) {
        console.error("Failed loading dashboard:", err)
      }
    }

    loadDashboard()
  }, [selectedStudio])

  if (!dashboard) {
    return <div>Loading...</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        title="Website Sessions"
        value={dashboard.kpis.sessions.toLocaleString()}
      />

      <MetricCard
        title="Users"
        value={dashboard.kpis.users.toLocaleString()}
      />

      <MetricCard
        title="Marketing Spend"
        value={`$${dashboard.kpis.paidSpend.toFixed(2)}`}
      />

      <MetricCard
        title="Paid Clicks"
        value={dashboard.kpis.paidClicks.toLocaleString()}
      />

      <MetricCard
        title="Engagement Rate"
        value={`${dashboard.kpis.engagementRate.toFixed(1)}%`}
      />
    </div>
  )
}