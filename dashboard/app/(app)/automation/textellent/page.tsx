import Link from "next/link"
import { ArrowLeft, MessageSquareText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TextellentPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <Link href="/automation" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Automation</Link>
        <h1 className="text-2xl font-semibold">Textellent</h1>
        <p className="mt-1 text-sm text-muted-foreground">Messaging automation and reporting.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><MessageSquareText className="size-5" /></span><CardTitle>Planned integration</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-6 text-muted-foreground">This workspace is reserved for Textellent campaigns, workflows, delivery activity, and customer-response reporting.</p></CardContent>
      </Card>
    </div>
  )
}
