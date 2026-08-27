"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"

import {
  type AppliedDateRange,
  type DateRangePreset,
  getCompletedDateRange,
} from "@/lib/date-range"
import { fetchWithRetry } from "@/lib/http/fetch-with-retry"

export interface Studio {
  id: number
  studio_code: string
  studio_name: string
  city: string
  state: string
}

interface AppContextType {
  studios: Studio[]
  loading: boolean

  selectedStudio: string
  setSelectedStudio: (value: string) => void

  dateRange: AppliedDateRange
  setDateRangePreset: (
    value: Exclude<DateRangePreset, "custom">
  ) => void
  setCustomDateRange: (startDate: string, endDate: string) => void

  comparison: "previous" | "priorYearWeek" | "custom"
  setComparison: (value: "previous" | "priorYearWeek" | "custom") => void
  comparisonDateRange: { startDate: string; endDate: string } | null
  setCustomComparisonRange: (startDate: string, endDate: string) => void
}

const AppContext =
  createContext<AppContextType | undefined>(undefined)

export function AppProvider({
  children,
}: {
  children: ReactNode
}) {
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedStudio, setSelectedStudio] = useState("all")
  const [dateRange, setDateRange] = useState<AppliedDateRange>(() =>
    getCompletedDateRange("30d")
  )
  const [comparison, setComparison] = useState<
    "previous" | "priorYearWeek" | "custom"
  >("previous")
  const [comparisonDateRange, setComparisonDateRange] = useState<{
    startDate: string
    endDate: string
  } | null>(null)

  useEffect(() => {
    async function loadStudios() {
      try {
        const res = await fetchWithRetry("/api/studios")
        const data = await res.json()
        setStudios(data)
      } finally {
        setLoading(false)
      }
    }

    loadStudios()
  }, [])

  return (
    <AppContext.Provider
      value={{
        studios,
        loading,
        selectedStudio,
        setSelectedStudio,
        dateRange,
        setDateRangePreset: (preset) =>
          setDateRange(getCompletedDateRange(preset)),
        setCustomDateRange: (startDate, endDate) =>
          setDateRange({ preset: "custom", startDate, endDate }),
        comparison,
        setComparison,
        comparisonDateRange,
        setCustomComparisonRange: (startDate, endDate) => {
          setComparisonDateRange({ startDate, endDate })
          setComparison("custom")
        },
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error(
      "useApp must be used inside AppProvider"
    )
  }

  return context
}
