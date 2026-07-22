"use client"

import { CalendarDays, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StudioSelect } from "@/components/studio/shared/studio-select"

type DashboardToolbarProps = {
  title: string
  subtitle: string
}

export function DashboardToolbar({
  title,
  subtitle,
}: DashboardToolbarProps) {
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

        <Button variant="outline">
          <CalendarDays className="mr-2 h-4 w-4" />
          Last 30 Days
        </Button>
      </div>
    </div>
  )
}