import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"

export function MarketingSourcePage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardToolbar title={title} subtitle={description} />
      <Card>
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
          <span className="rounded-full bg-primary/10 p-4 text-primary">
            <Construction className="size-7" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Drill-down foundation is ready</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              This source now has a permanent page in the marketing section. Its detailed charts and tables are the next focused build.
            </p>
          </div>
          <Link href="/marketing" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" />
            Back to Marketing Performance
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
