import "server-only"

import { supabase } from "@/lib/supabase/server"

export type ConnectorHealthState = "connected" | "attention" | "not_connected"
export type ConnectorHealthItem = { key: "pts" | "textellent" | "ga4" | "meta" | "eulerity" | "mntn" | "homebase"; name: string; state: ConnectorHealthState; label: string; settingsHref: string }

const vaultReference = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function configuredState(hasCredentials: boolean, hasMapping: boolean) {
  if (!hasCredentials) return { state: "not_connected" as const, label: "Not connected" }
  if (!hasMapping) return { state: "attention" as const, label: "Needs mapping" }
  return { state: "connected" as const, label: "Connected" }
}

export async function getConnectorHealth(organizationId: number, allowedStudioIds: number[]): Promise<ConnectorHealthItem[]> {
  const [mappingResult, ptsResult, textellentResult, textellentAssignmentResult, ga4Result, metaResult, eulerityResult, mntnResult, homebaseResult] = await Promise.all([
    supabase.from("studio_integrations").select("integration_type").eq("organization_id", organizationId).in("studio_id", allowedStudioIds).eq("is_active", true),
    supabase.from("pts_integration_accounts").select("secret_reference").eq("organization_id", organizationId).eq("is_active", true),
    supabase.from("textellent_accounts").select("id").eq("organization_id", organizationId).eq("is_active", true),
    supabase.from("textellent_studio_assignments").select("studio_id").eq("organization_id", organizationId).in("studio_id", allowedStudioIds),
    supabase.from("ga4_integration_accounts").select("secret_reference").eq("organization_id", organizationId).eq("is_active", true),
    supabase.from("meta_integration_accounts").select("secret_reference,connection_status,token_expires_at").eq("organization_id", organizationId).eq("is_active", true),
    supabase.from("eulerity_integration_accounts").select("secret_reference").eq("organization_id", organizationId).eq("is_active", true),
    supabase.from("mntn_integration_accounts").select("secret_reference").eq("organization_id", organizationId).eq("is_active", true),
    supabase.from("homebase_integration_accounts").select("secret_reference,last_validated_at").eq("organization_id", organizationId).eq("is_active", true),
  ])
  for (const result of [mappingResult, ptsResult, textellentResult, textellentAssignmentResult, ga4Result, metaResult, eulerityResult, mntnResult, homebaseResult]) if (result.error) throw result.error

  const mappedTypes = new Set((mappingResult.data ?? []).map((mapping) => mapping.integration_type.toLowerCase()))
  const hasMapping = (...types: string[]) => types.some((type) => mappedTypes.has(type))
  const hasVaultCredential = (accounts: Array<{ secret_reference: string | null }>) => accounts.some((account) => vaultReference.test(account.secret_reference ?? ""))
  const pts = configuredState(hasVaultCredential(ptsResult.data ?? []), hasMapping("pts"))
  const textellent = configuredState((textellentResult.data ?? []).length > 0, (textellentAssignmentResult.data ?? []).length > 0)
  const ga4 = configuredState(hasVaultCredential(ga4Result.data ?? []), hasMapping("ga4"))
  const eulerity = configuredState(hasVaultCredential(eulerityResult.data ?? []), hasMapping("eulerity"))
  const mntn = configuredState(hasVaultCredential(mntnResult.data ?? []), hasMapping("mntn"))
  const homebaseCredentials = hasVaultCredential(homebaseResult.data ?? [])
  const homebase = homebaseCredentials && (homebaseResult.data ?? []).some(account => !account.last_validated_at)
    ? { state: "attention" as const, label: "Needs validation" }
    : configuredState(homebaseCredentials, hasMapping("homebase"))
  const metaAccounts = metaResult.data ?? []
  const metaCredential = hasVaultCredential(metaAccounts)
  const metaMapping = hasMapping("meta", "meta_ads", "meta_page", "meta_instagram")
  const reconnectBy = Date.now() + 30 * 24 * 60 * 60 * 1000
  const metaNeedsReconnect = metaAccounts.some((account) => account.connection_status !== "connected" || (account.token_expires_at !== null && new Date(account.token_expires_at).getTime() <= reconnectBy))
  const meta = metaCredential && metaMapping && metaNeedsReconnect ? { state: "attention" as const, label: "Reconnect soon" } : configuredState(metaCredential, metaMapping)

  return [
    { key: "pts", name: "PTS", ...pts, settingsHref: "/settings#pts-connections" },
    { key: "textellent", name: "Textellent", ...textellent, settingsHref: "/settings#textellent-connections" },
    { key: "ga4", name: "GA4", ...ga4, settingsHref: "/settings#ga4-connections" },
    { key: "meta", name: "Meta", ...meta, settingsHref: "/settings#meta-connections" },
    { key: "eulerity", name: "Eulerity", ...eulerity, settingsHref: "/settings#eulerity-connections" },
    { key: "mntn", name: "MNTN", ...mntn, settingsHref: "/settings#mntn-connections" },
    { key: "homebase", name: "Homebase", ...homebase, settingsHref: "/settings#homebase-connections" },
  ]
}
