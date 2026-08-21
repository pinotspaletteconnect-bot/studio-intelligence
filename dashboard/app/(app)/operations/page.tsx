import { OperationsDashboard } from "@/components/studio/operations/operations-dashboard"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import Link from "next/link"
import { Upload } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { requireDashboardContext } from "@/lib/auth/session"

export default async function OperationsPage() {
  const access = await requireDashboardContext()
  const canBackfill = ["owner", "administrator"].includes(access.role)
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardToolbar
        title="Operations Performance"
        subtitle="Review completed-day sales, seats, per-seat revenue, and food and beverage mix."
        showComparison
      />
      {canBackfill ? <div className="flex justify-end"><Link href="/operations/backfills" className={buttonVariants({ variant: "outline" })}><Upload />PTS backfills</Link></div> : null}
      <OperationsDashboard />
    </div>
  )
}
