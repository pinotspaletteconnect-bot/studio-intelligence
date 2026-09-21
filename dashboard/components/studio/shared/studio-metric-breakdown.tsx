export type StudioMetricRow = { studioId: number; studioName: string; value: string; detail?: string }

export function StudioMetricBreakdown({ rows, label }: { rows: StudioMetricRow[]; label: string }) {
  return (
    <dl aria-label={`${label} by studio`} className="min-w-0 space-y-2 border-t pt-3 text-xs @min-[360px]:border-t-0 @min-[360px]:border-l @min-[360px]:pt-0 @min-[360px]:pl-4">
      {rows.map((row) => (
        <div key={row.studioId} className="flex items-baseline justify-between gap-3">
          <dt className="min-w-0 text-muted-foreground">{row.studioName}</dt>
          <dd className="shrink-0 text-right tabular-nums font-medium">
            <span>{row.value}</span>
            {row.detail ? <span className="block text-[10px] font-normal text-muted-foreground">{row.detail}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
