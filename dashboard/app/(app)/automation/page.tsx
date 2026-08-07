import Link from "next/link"
import { ArrowRight, MessageSquareText, TableProperties } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const automationAreas = [
  {
    href: "/automation/textellent",
    title: "Textellent",
    description: "Messaging automation, campaign workflows, and customer communication reporting.",
    icon: MessageSquareText,
  },
  {
    href: "/automation/seating-charts",
    title: "Seating Charts",
    description: "Class seating layouts, reservation placement, and studio floor coordination.",
    icon: TableProperties,
  },
]

export default function AutomationPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Automation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workflow tools being prepared for SASHA.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {automationAreas.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-5" /></span>
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
