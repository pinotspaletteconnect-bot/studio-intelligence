import { Badge } from "@/components/ui/badge"
import { CURRENT_PRIVACY, CURRENT_TERMS } from "@/lib/legal/documents"

type Member = { user_id: string; name: string; email: string; status: string }
type Acceptance = { user_id: string; terms_version: string; privacy_version: string; accepted_at: string; acceptance_method: string }

export function LegalAcceptanceStatus({ members, acceptances }: { members: Member[]; acceptances: Acceptance[] }) {
  return <div id="legal-acceptance" className="space-y-4 scroll-mt-4">
    <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Current versions: Terms {CURRENT_TERMS.version} · Privacy {CURRENT_PRIVACY.version}</div>
    <div className="divide-y rounded-lg border">{members.map((member) => {
      const acceptance = acceptances.find((item) => item.user_id === member.user_id && item.terms_version === CURRENT_TERMS.version && item.privacy_version === CURRENT_PRIVACY.version)
      return <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between" key={member.user_id}>
        <div><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.email}</p></div>
        <div className="text-left sm:text-right">{acceptance ? <><Badge className="bg-emerald-100 text-emerald-800">Accepted</Badge><p className="mt-1 text-xs text-muted-foreground">{new Date(acceptance.accepted_at).toLocaleString()} · {acceptance.acceptance_method.replaceAll("_", " ")}</p></> : <Badge variant="outline" className="border-amber-300 text-amber-800">Acceptance required</Badge>}</div>
      </div>
    })}</div>
  </div>
}
