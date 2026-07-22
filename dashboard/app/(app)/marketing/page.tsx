"use client"

import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import { MarketingKPIs } from "@/components/studio/marketing/marketing-kpis"
import { MarketingTrendChart } from "@/components/studio/marketing/marketing-trend-chart"

export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardToolbar
        title="Marketing Intelligence"
        subtitle="Marketing performance across all connected studios"
      />

      <MarketingKPIs />

      <MarketingTrendChart />
    </div>
  )
}