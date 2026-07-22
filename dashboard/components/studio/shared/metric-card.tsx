"use client"

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import {
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react"

type MetricCardProps = {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  subtitle: string
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  subtitle,
}: MetricCardProps) {
  const TrendingIcon =
    trend === "up"
      ? TrendingUpIcon
      : TrendingDownIcon

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>

        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>

        <CardAction>
          <Badge variant="outline">
            <TrendingIcon className="mr-1 size-4" />
            {change}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex items-center gap-2 font-medium">
          {subtitle}
          <TrendingIcon className="size-4" />
        </div>
      </CardFooter>
    </Card>
  )
}