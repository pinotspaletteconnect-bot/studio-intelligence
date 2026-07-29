"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import { useApp } from "@/contexts/app-context"

export function StudioSelect() {
  const { studios, loading, selectedStudio, setSelectedStudio } = useApp()

  const selectedStudioLabel =
    selectedStudio === "all"
      ? "All Studios"
      : studios.find((studio) => studio.id.toString() === selectedStudio)
          ?.studio_name ?? "Select Studio"

  return (
    <Select
      value={selectedStudio}
      onValueChange={(value) => {
        if (value) {
          setSelectedStudio(value)
        }
      }}
      disabled={loading}
    >
      <SelectTrigger className="w-56">
        <span className="flex-1 truncate text-left">
          {loading ? "Loading studios..." : selectedStudioLabel}
        </span>
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="all">All Studios</SelectItem>

        {studios.map((studio) => (
          <SelectItem key={studio.id} value={studio.id.toString()}>
            {studio.studio_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
