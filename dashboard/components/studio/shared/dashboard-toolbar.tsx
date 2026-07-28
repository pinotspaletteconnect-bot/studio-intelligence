"use client"

import { CalendarDays, Building2 } from "lucide-react"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { useApp } from "@/contexts/app-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DashboardToolbarProps = {
  title: string
  subtitle: string
}

export function DashboardToolbar({
  title,
  subtitle,
}: DashboardToolbarProps) {
  const { dateRange, setDateRange } = useApp()

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>

        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />

          <StudioSelect />
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(value) => value && setDateRange(value)}>
            <SelectTrigger className="w-36" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
