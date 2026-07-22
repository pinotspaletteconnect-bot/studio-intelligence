"use client"

import { MetricCard } from "@/components/studio/shared/metric-card"

const executiveMetrics = [
  {
    title: "Today's Revenue",
    value: "$5,381",
    change: "+14.8%",
    trend: "up" as const,
    subtitle: "Compared to last Tuesday",
  },
  {
    title: "7-Day Revenue",
    value: "$38,472",
    change: "+9.3%",
    trend: "up" as const,
    subtitle: "Rolling 7-day performance",
  },
  {
    title: "Marketing Spend",
    value: "$1,143",
    change: "-4.2%",
    trend: "down" as const,
    subtitle: "Meta + Eulerity spend",
  },
  {
    title: "Website Sessions",
    value: "3,487",
    change: "+18.1%",
    trend: "up" as const,
    subtitle: "Google Analytics 4",
  },
]

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {executiveMetrics.map((metric) => (
        <MetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          trend={metric.trend}
          subtitle={metric.subtitle}
        />
      ))}
    </div>
  )
}