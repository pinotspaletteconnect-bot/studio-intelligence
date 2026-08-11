import "server-only"

import { CURRENT_PRIVACY, CURRENT_TERMS } from "@/lib/legal/documents"
import { supabase } from "@/lib/supabase/server"

export async function hasCurrentLegalAcceptance(userId: string, organizationId: number) {
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("terms_version", CURRENT_TERMS.version)
    .eq("terms_content_sha256", CURRENT_TERMS.contentSha256)
    .eq("privacy_version", CURRENT_PRIVACY.version)
    .eq("privacy_content_sha256", CURRENT_PRIVACY.contentSha256)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function recordCurrentLegalAcceptance(input: {
  userId: string
  organizationId: number
  method: "onboarding" | "policy_update"
  ipAddress: string | null
  userAgent: string | null
}) {
  const { error } = await supabase.from("legal_acceptances").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    terms_version: CURRENT_TERMS.version,
    terms_content_sha256: CURRENT_TERMS.contentSha256,
    privacy_version: CURRENT_PRIVACY.version,
    privacy_content_sha256: CURRENT_PRIVACY.contentSha256,
    acceptance_method: input.method,
    ip_address: input.ipAddress,
    user_agent: input.userAgent?.slice(0, 1000) ?? null,
  })
  if (error && error.code !== "23505") throw error
}

export async function getOrganizationLegalAcceptanceStatus(organizationId: number) {
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("user_id,terms_version,privacy_version,accepted_at,acceptance_method")
    .eq("organization_id", organizationId)
    .order("accepted_at", { ascending: false })
  if (error) throw error
  return data ?? []
}
