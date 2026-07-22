"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"

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

  dateRange: string
  setDateRange: (value: string) => void

  comparison: string
  setComparison: (value: string) => void
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
  const [dateRange, setDateRange] = useState("30d")
  const [comparison, setComparison] = useState("previous")

  useEffect(() => {
    async function loadStudios() {
      try {
        const res = await fetch("/api/studios")
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
        setDateRange,
        comparison,
        setComparison,
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