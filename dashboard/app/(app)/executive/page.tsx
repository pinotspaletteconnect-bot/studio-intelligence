import { ConnectorHealthBar } from "@/components/studio/executive/connector-health-bar"
import { ExecutiveDashboard } from "@/components/studio/executive/executive-dashboard"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import { requireDashboardContext } from "@/lib/auth/session"
import { getConnectorHealth } from "@/lib/services/connector-health"

export default async function ExecutivePage() {
  const access = await requireDashboardContext()
  const connectors = await getConnectorHealth(access.organizationId, access.allowedStudioIds)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardToolbar
        title="Executive Performance"
        subtitle="A concise view of revenue, operations, customer demand, and marketing performance."
        showComparison
      />
      <ConnectorHealthBar connectors={connectors} />
      <ExecutiveDashboard />
    </div>
  )
}
