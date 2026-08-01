import { DailyOperatingDetail } from "@/components/studio/operations/daily-operating-detail"
import { getCompletedDateRange } from "@/lib/date-range"

export default async function DailyOperatingDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const requestedDate = (await searchParams).date
  const fallbackDate = getCompletedDateRange("7d").endDate
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate ?? "")
    ? requestedDate!
    : fallbackDate

  return <div className="p-4 md:p-6"><DailyOperatingDetail initialDate={initialDate} /></div>
}
