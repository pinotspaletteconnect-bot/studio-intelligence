import { BackfillUpload } from "@/app/(app)/operations/backfills/backfill-upload"
import { requireDashboardContext } from "@/lib/auth/session"
import { getPtsBackfillStudios } from "@/lib/services/pts-backfills"

export default async function PtsBackfillsPage() {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) return <div className="p-6"><h1 className="text-2xl font-semibold">PTS backfills</h1><p className="mt-2 text-sm text-muted-foreground">Administrator access is required.</p></div>
  const studios = await getPtsBackfillStudios(access.organizationId, access.allowedStudioIds)
  return <div className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-2xl font-semibold">PTS historical backfills</h1><p className="mt-1 text-sm text-muted-foreground">Upload one studio workbook at a time. SASHA will validate and import it, then report whether the upload succeeded.</p></div>
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Download each workbook directly from the matching PTS studio and report. Re-uploading the same period updates existing historical records rather than duplicating them.</div>
    <BackfillUpload studios={studios} />
  </div>
}
