"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function MarketingTrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Trends</CardTitle>
        <CardDescription>
          Website traffic and advertising performance over time
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex h-[350px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
          Marketing Trend Chart
        </div>
      </CardContent>
    </Card>
  )
}