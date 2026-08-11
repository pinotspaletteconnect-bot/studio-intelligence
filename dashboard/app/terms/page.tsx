import terms from "@/content/legal/terms-2026-08-11-draft.json"
import { LegalDocument } from "@/components/legal/legal-document"
import { CURRENT_TERMS } from "@/lib/legal/documents"

export default function TermsPage() {
  return <LegalDocument content={terms} effectiveDate={CURRENT_TERMS.effectiveDate} version={CURRENT_TERMS.version} />
}
