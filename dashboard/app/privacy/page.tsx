import privacy from "@/content/legal/privacy-2026-08-11-draft.json"
import { LegalDocument } from "@/components/legal/legal-document"
import { CURRENT_PRIVACY } from "@/lib/legal/documents"

export default function PrivacyPage() {
  return <LegalDocument content={privacy} effectiveDate={CURRENT_PRIVACY.effectiveDate} version={CURRENT_PRIVACY.version} />
}
