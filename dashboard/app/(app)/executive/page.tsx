"use client"

import { ExecutiveDashboard } from "@/components/studio/executive/executive-dashboard"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"

export default function ExecutivePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardToolbar
        title="Executive Performance"
        subtitle="A concise view of revenue, operations, customer demand, and marketing performance."
        showComparison
      />
      <ExecutiveDashboard />
    </div>
  )
}
