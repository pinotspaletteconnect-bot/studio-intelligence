"use client"

import { MarketingDashboard } from "@/components/studio/marketing/marketing-dashboard"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"

export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardToolbar
        title="Marketing Performance"
        subtitle="Track and compare performance across every connected marketing source."
      />
      <MarketingDashboard />
    </div>
  )
}
