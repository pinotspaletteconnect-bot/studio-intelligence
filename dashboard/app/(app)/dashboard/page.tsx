import Link from "next/link"
import { ArrowRight, ChartNoAxesCombined, Megaphone, Presentation } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const areas = [
  {
    href: "/operations",
    title: "Operations",
    description: "Completed sales, seats, product mix, class performance, and upcoming demand.",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/marketing",
    title: "Marketing",
    description: "Paid media, website activity, attribution, and channel performance.",
    icon: Megaphone,
  },
  {
    href: "/executive",
    title: "Executive",
    description: "Cross-functional leadership KPIs and business performance overview.",
    icon: Presentation,
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a reporting area to review Studio Intelligence data.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {areas.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-5" /></div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Open {title}<ArrowRight className="size-4" /></span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
