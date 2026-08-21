"use client"

import { CircleHelp } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function KpiHelp({ description, className }: { description: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`About this KPI: ${description}`}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <CircleHelp className="size-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty leading-relaxed" side="top">
        {description}
      </TooltipContent>
    </Tooltip>
  )
}
