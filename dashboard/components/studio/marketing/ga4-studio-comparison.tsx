import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Ga4NorthAmericaDashboard } from "@/lib/services/ga4-reporting"

type Format = "number" | "percent" | "currency" | "duration" | "decimal"
const metrics: { key: keyof Ga4NorthAmericaDashboard["kpis"]; label: string; format: Format }[] = [
  { key: "activeUsers", label: "Avg. daily active users", format: "number" },
  { key: "sessions", label: "Sessions", format: "number" },
  { key: "newUsers", label: "New users", format: "number" },
  { key: "engagementRate", label: "Engagement rate", format: "percent" },
  { key: "pageViewsPerUser", label: "Views per daily user", format: "decimal" },
  { key: "averageEngagementTime", label: "Avg. session duration", format: "duration" },
  { key: "keyEvents", label: "Key events", format: "number" },
  { key: "purchases", label: "Purchases", format: "number" },
  { key: "purchaseRevenue", label: "Purchase revenue", format: "currency" },
  { key: "conversionRate", label: "Purchase conversion", format: "percent" },
]
const dates = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
function valueLabel(value: number | null, format: Format): string {
  if (value === null) return "—"
  if (format === "percent") return `${value.toFixed(1)}%`
  if (format === "decimal") return value.toFixed(2)
  if (format === "duration") {
    const seconds = Math.round(value)
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  }
  return value.toLocaleString("en-US", format === "currency"
    ? { style: "currency", currency: "USD", maximumFractionDigits: 0 }
    : { maximumFractionDigits: 1 })
}
const signed = (value: number, label: string) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${label}`

export function Ga4StudioComparison({ data }: { data: Ga4NorthAmericaDashboard }) {
  const range = (period: { startDate: string; endDate: string }) => `${dates.format(new Date(`${period.startDate}T00:00:00Z`))} – ${dates.format(new Date(`${period.endDate}T00:00:00Z`))}`
  return <Card>
    <CardHeader>
      <CardTitle>Studio comparison</CardTitle>
      <CardDescription>Current: {range(data.period)} · Compared with: {range(data.comparisonPeriod)}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto rounded-lg border" role="region" aria-label="GA4 studio comparison" tabIndex={0}>
        <table className="w-full table-fixed text-sm" style={{ minWidth: 180 + data.studios.length * 215 }}>
          <caption className="sr-only">North America GA4 metrics by studio, including comparison values and changes.</caption>
          <thead><tr className="border-b bg-muted/40">
            <th scope="col" className="sticky left-0 z-10 w-44 bg-background p-4 text-left">Metric</th>
            {data.studios.map(studio => <th scope="col" key={studio.id} className="border-l p-4 text-left align-top">
              <p className="font-semibold">{studio.name}</p>
              <p className="mt-1 text-xs font-normal text-muted-foreground">{studio.currentDays}/{data.periodDays} current days · {studio.previousDays}/{data.comparisonDays} comparison days</p>
            </th>)}
          </tr></thead>
          <tbody>{metrics.map(({ key, label, format }) => <tr key={key} className="border-b last:border-0">
            <th scope="row" className="sticky left-0 z-10 bg-background p-4 text-left font-medium">{label}</th>
            {data.studios.map(studio => {
              const metric = studio.kpis[key]
              const delta = metric.delta
              const currentDays = key === "keyEvents" ? studio.currentKeyEventDays : studio.currentDays
              const previousDays = key === "keyEvents" ? studio.previousKeyEventDays : studio.previousDays
              const incomplete = currentDays < data.periodDays || previousDays < data.comparisonDays
              const deltaLabel = delta === null ? (incomplete ? "Change unavailable: incomplete period" : "Change unavailable") : signed(delta, format === "percent" ? `${Math.abs(delta).toFixed(1)} pp` : valueLabel(Math.abs(delta), format))
              return <td key={studio.id} className="border-l p-4 align-top tabular-nums">
                <p className="text-xl font-semibold">{valueLabel(metric.value, format)}</p>
                {currentDays > 0 && currentDays < data.periodDays && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Partial: {currentDays}/{data.periodDays} current days</p>}
                <p className="mt-1 text-xs text-muted-foreground">Comparison: {valueLabel(metric.previous, format)}</p>
                {previousDays > 0 && previousDays < data.comparisonDays && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Partial: {previousDays}/{data.comparisonDays} comparison days</p>}
                <p className={`mt-1 text-xs font-medium ${delta === null || delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                  {deltaLabel}{format !== "percent" && metric.change !== null ? ` (${signed(metric.change, `${Math.abs(metric.change).toFixed(1)}%`)})` : ""}
                </p>
                {delta !== null && metric.previous === 0 && format !== "percent" && <p className="mt-1 text-xs text-muted-foreground">% change unavailable: zero baseline</p>}
              </td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Partial values include only loaded days; daily averages use loaded days, and missing days are never counted as zero. Key events have separate day coverage. Changes appear only when both periods are complete. Rate changes use percentage points (pp). A dash means no data or an unavailable metric.</p>
    </CardContent>
  </Card>
}
