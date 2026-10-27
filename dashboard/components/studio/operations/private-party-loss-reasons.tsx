"use client"

import { Cell, Pie, PieChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { PrivatePartiesData } from "@/lib/services/private-parties"

const colors = ["#2563eb", "#7c3aed", "#0891b2", "#d97706", "#db2777", "#059669", "#dc2626", "#64748b", "#4f46e5"]

type LeadSummary = NonNullable<PrivatePartiesData["leads"]["summary"]>

export function PrivatePartyLossReasons({ summary }: { summary: LeadSummary }) {
  return <section aria-labelledby="party-loss-reasons" className="rounded-xl border bg-card p-5">
    <h3 id="party-loss-reasons" className="text-lg font-semibold">Why private-party leads were lost</h3>
    <p className="mt-1 text-sm text-muted-foreground">Recorded disposition reasons for lost leads originally received in the selected dates and studios, as of the latest daily refresh. These are inquiry dates, not the dates the leads were dispositioned.</p>
    {summary.lossReasons.length ? <div className="mt-4 grid items-center gap-6 lg:grid-cols-[minmax(240px,360px)_1fr]">
      <div className="relative" role="img" aria-label={`${summary.stages.lost} lost private-party leads by recorded reason. Counts and percentages are in the adjacent table.`}>
        <ChartContainer className="mx-auto h-[280px] w-full" config={{ count: { label: "Lost leads" } }}>
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="reason" hideLabel />} />
            <Pie data={summary.lossReasons} dataKey="count" nameKey="reason" innerRadius={72} outerRadius={112} paddingAngle={2} isAnimationActive={false}>
              {summary.lossReasons.map((row, index) => <Cell key={row.reason} fill={colors[index % colors.length]} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true"><span className="text-3xl font-semibold tabular-nums">{summary.stages.lost}</span><span className="text-xs text-muted-foreground">lost leads</span></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[320px] text-sm"><caption className="sr-only">Disposition reasons and share of lost leads</caption><thead><tr className="border-b text-left"><th scope="col" className="py-3">Recorded reason</th><th scope="col" className="text-right">Lost leads</th><th scope="col" className="text-right">Share of lost leads</th></tr></thead><tbody>
        {summary.lossReasons.map((row, index) => <tr key={row.reason} className="border-b last:border-0"><th scope="row" className="py-3 pr-3 text-left font-normal"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />{row.reason}</th><td className="text-right tabular-nums">{row.count}</td><td className="text-right tabular-nums">{row.shareOfLost.toFixed(1)}%</td></tr>)}
      </tbody></table></div>
    </div> : <p className="mt-4 text-sm text-muted-foreground">No lost leads among the dated inquiries in this selection.</p>}
    <p className="mt-3 text-xs text-muted-foreground">Reasons come directly from Party Planner; missing reasons show as “Not specified.” Undated inquiries are excluded from this dated breakdown. “Joined Public Class” means the private-party opportunity ended, even if a public class was purchased. No cause is inferred from notes.</p>
  </section>
}
