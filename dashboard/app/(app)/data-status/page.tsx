import { AlertTriangle, CheckCircle2, CircleHelp, Clock3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireDashboardContext } from "@/lib/auth/session"
import {
  getDataUploadStatus,
  type UploadFeedStatus,
  type UploadFreshness,
} from "@/lib/services/data-upload-status"

const statusPresentation: Record<
  UploadFreshness,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  current: {
    label: "Current",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  partial: {
    label: "Partial",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  overdue: {
    label: "Overdue",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: Clock3,
  },
  missing: {
    label: "No data",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    icon: CircleHelp,
  },
  error: {
    label: "Unavailable",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: AlertTriangle,
  },
}

function formatDate(value: string | null) {
  if (!value) return "Not received"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

function formatReceivedAt(value: string | null) {
  if (!value) return "Not received"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value))
}

function FeedCard({ feed }: { feed: UploadFeedStatus }) {
  const presentation = statusPresentation[feed.freshness]
  const StatusIcon = presentation.icon

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{feed.name}</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{feed.description}</p>
          </div>
          <Badge variant="outline" className={presentation.className}>
            <StatusIcon className="size-3.5" />
            {presentation.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest business date</p>
            <p className="mt-1 font-semibold">{formatDate(feed.latestBusinessDate)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Expected {formatDate(feed.expectedDate)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last received</p>
            <p className="mt-1 font-semibold">{formatReceivedAt(feed.lastReceivedAt)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Studios represented</p>
            <p className="mt-1 font-semibold">{feed.representedStudios} of {feed.totalStudios}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rows on latest date</p>
            <p className="mt-1 font-semibold">{feed.rowCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {feed.studios.map(studio => (
            <div key={studio.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{studio.name}</p>
                <p className="text-xs text-muted-foreground">
                  {studio.hasRows ? `${studio.rowCount.toLocaleString()} rows` : "No rows represented"}
                </p>
              </div>
              {studio.hasRows ? (
                <CheckCircle2 className="size-4 text-emerald-600" aria-label="Represented" />
              ) : (
                <AlertTriangle className="size-4 text-amber-600" aria-label="Not represented" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DataStatusPage() {
  const access = await requireDashboardContext()
  const status = await getDataUploadStatus(access.organizationId, access.allowedStudioIds)
  const issueCount = status.feeds.filter(feed => feed.freshness !== "current").length

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Data Upload Status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify the latest business date and warehouse receipt for every PTS feed.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Checked {formatReceivedAt(status.checkedAt)} · {issueCount === 0 ? "All feeds current" : `${issueCount} feed${issueCount === 1 ? "" : "s"} need attention`}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Studio coverage means the latest stored date contains rows for that studio. A valid zero-row source slice may require the workflow audit record for final confirmation.
      </div>

      <div className="space-y-4">
        {status.feeds.map(feed => <FeedCard key={feed.key} feed={feed} />)}
      </div>
    </div>
  )
}
