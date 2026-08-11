import { AcceptanceForm } from "@/app/legal/accept/acceptance-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { CURRENT_PRIVACY, CURRENT_TERMS, LEGAL_REVIEW_NOTICE } from "@/lib/legal/documents"
import { requireLegalAcceptanceContext } from "@/lib/auth/session"

export default async function LegalAcceptancePage() {
  await requireLegalAcceptanceContext()
  return <AuthShell title="Review updated policies" description="Current policy acceptance is required before accessing business data.">
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{LEGAL_REVIEW_NOTICE}</div>
    <p className="mb-5 text-xs leading-5 text-muted-foreground">Terms {CURRENT_TERMS.version} · Privacy {CURRENT_PRIVACY.version}</p>
    <AcceptanceForm />
  </AuthShell>
}
