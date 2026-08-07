import Link from "next/link"
import { ArrowLeft, MessageSquareText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireDashboardContext } from "@/lib/auth/session"
import { getTextellentAutomation } from "@/lib/services/textellent-automation"
import { StudioAlertForm, TextellentTestForm } from "./textellent-settings"

export default async function TextellentPage() {
  const access = await requireDashboardContext()
  const data = await getTextellentAutomation(access.organizationId, access.allowedStudioIds)
  const canManage = ["owner", "administrator"].includes(access.role)
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <Link href="/automation" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Automation</Link>
        <h1 className="text-2xl font-semibold">Textellent</h1>
        <p className="mt-1 text-sm text-muted-foreground">Low-enrollment class alerts through each studio&apos;s assigned Textellent connection.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><MessageSquareText className="size-5" /></span><CardTitle>Class alert rules</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-6 text-muted-foreground">Classes below each studio&apos;s minimum reservation setting are rechecked at send time. A minimum of 3 alerts classes with 1 or 2 reservations. Purchaser phone numbers are read transiently from the PTS Seating Chart and are never saved in SASHA.</p></CardContent>
      </Card>
      {canManage ? <Card><CardHeader><CardTitle>Send test message</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Send one real message to an approved test number before enabling customer alerts. The recipient number and message are not saved in SASHA or included in audit logs.</p><TextellentTestForm accounts={data.accounts} /></CardContent></Card> : null}
      <Card><CardHeader><CardTitle>Studio automation</CardTitle></CardHeader><CardContent className="space-y-4">{canManage ? data.studios.map(studio => {
        const assignment = data.assignments.find(row => row.studio_id === studio.id)
        const setting = data.settings.find(row => row.studio_id === studio.id)
        return <StudioAlertForm key={`${studio.id}:${assignment?.textellent_account_id ?? "none"}:${setting?.updated_at ?? "none"}`} studio={studio} accounts={data.accounts} assignment={assignment} setting={setting} />
      }) : <p className="text-sm text-muted-foreground">Only owners and administrators can edit these rules.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent activity</CardTitle></CardHeader><CardContent>{data.deliveries.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Studio</th><th>Class</th><th>Status</th><th className="text-right">Reservations</th><th className="text-right">Recipients</th><th className="text-right">Attempted</th></tr></thead><tbody>{data.deliveries.map(row => <tr key={row.id} className="border-b last:border-0"><td className="py-3">{data.studios.find(studio => studio.id === row.studio_id)?.studio_name ?? row.studio_id}</td><td>{row.source_class_id}</td><td className="capitalize">{row.status}</td><td className="text-right">{row.reservation_count}</td><td className="text-right">{row.recipient_count}</td><td className="text-right">{new Date(row.attempted_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No class alerts have been attempted. Phone numbers will never appear here.</p>}</CardContent></Card>
    </div>
  )
}
