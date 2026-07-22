"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useApp } from "@/contexts/app-context"

export function StudioSelect() {
  const {
    studios,
    loading,
    selectedStudio,
    setSelectedStudio,
  } = useApp()

  return (
    <Select
      value={selectedStudio}
      onValueChange={setSelectedStudio}
      disabled={loading}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select Studio" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="all">
          All Studios
        </SelectItem>

        {studios.map((studio) => (
          <SelectItem
            key={studio.id}
            value={studio.id.toString()}
          >
            {studio.studio_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}