"use client"

import { useState } from "react"
import { Building2, CalendarDays } from "lucide-react"

import { StudioSelect } from "@/components/studio/shared/studio-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useApp } from "@/contexts/app-context"
import {
  type DateRangePreset,
  formatAppliedDateRange,
  getCompletedDateRange,
} from "@/lib/date-range"

type DashboardToolbarProps = {
  title: string
  subtitle: string
}

export function DashboardToolbar({
  title,
  subtitle,
}: DashboardToolbarProps) {
  const { dateRange, setCustomDateRange, setDateRangePreset } = useApp()
  const [rangeMode, setRangeMode] = useState<DateRangePreset>(
    dateRange.preset
  )
  const [customStart, setCustomStart] = useState(dateRange.startDate)
  const [customEnd, setCustomEnd] = useState(dateRange.endDate)
  const yesterday = getCompletedDateRange("7d").endDate
  const customIsValid =
    Boolean(customStart && customEnd) &&
    customStart <= customEnd &&
    customEnd <= yesterday

  const chooseRange = (preset: DateRangePreset | null) => {
    if (!preset) return

    setRangeMode(preset)

    if (preset !== "custom") {
      setDateRangePreset(preset)
    } else {
      setCustomStart(dateRange.startDate)
      setCustomEnd(dateRange.endDate)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <StudioSelect />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={rangeMode} onValueChange={chooseRange}>
            <SelectTrigger className="w-40" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 completed days</SelectItem>
              <SelectItem value="30d">Last 30 completed days</SelectItem>
              <SelectItem value="90d">Last 90 completed days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {rangeMode === "custom" && (
            <>
              <Input
                type="date"
                value={customStart}
                max={customEnd || yesterday}
                onChange={(event) => setCustomStart(event.target.value)}
                className="w-[145px]"
                aria-label="Custom start date"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEnd}
                min={customStart}
                max={yesterday}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="w-[145px]"
                aria-label="Custom end date"
              />
              <Button
                size="sm"
                disabled={!customIsValid}
                onClick={() => setCustomDateRange(customStart, customEnd)}
              >
                Apply
              </Button>
            </>
          )}

          <p className="basis-full text-right text-xs text-muted-foreground">
            Showing {formatAppliedDateRange(dateRange)}
          </p>
        </div>
      </div>
    </div>
  )
}
