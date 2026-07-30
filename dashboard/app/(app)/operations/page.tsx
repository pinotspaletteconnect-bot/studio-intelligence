"use client"

import { OperationsDashboard } from "@/components/studio/operations/operations-dashboard"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"

export default function OperationsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardToolbar
        title="Operations Performance"
        subtitle="Review completed-day sales, seats, per-seat revenue, and food and beverage mix."
      />
      <OperationsDashboard />
    </div>
  )
}
