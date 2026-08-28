import "server-only"
import { randomUUID } from "node:crypto"
import { supabase } from "@/lib/supabase/server"
import { ApiAccessError, assertStudioAccess } from "@/lib/auth/api"
import type { UserAccessContext } from "@/lib/auth/session"
import { readTargetSettings, type TargetCircle } from "@/lib/maps/target-circles"

export class MapTargetError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function assertTargetEditor(access: UserAccessContext) {
  if (!["owner", "administrator"].includes(access.role)) throw new ApiAccessError(403, "Administrator access is required to change targeting circles.")
}

async function integrationFor(access: UserAccessContext, studioId: number) {
  assertStudioAccess(access, studioId)
  const { data, error } = await supabase.from("studio_integrations")
    .select("id,configuration").eq("organization_id", access.organizationId)
    .eq("studio_id", studioId).eq("integration_type", "pts").eq("is_active", true).maybeSingle()
  if (error) throw error
  if (!data) throw new MapTargetError(404, "No active PTS configuration exists for this studio.")
  return data as { id: number; configuration: Record<string, unknown> | null }
}

export async function getMapTargets(access: UserAccessContext, studioId: number) {
  const integration = await integrationFor(access, studioId)
  return { ...readTargetSettings(integration.configuration ?? {}), canEdit: ["owner", "administrator"].includes(access.role) }
}

export async function saveMapTargets(access: UserAccessContext, studioId: number, circles: TargetCircle[], expectedRevision: string | null) {
  assertTargetEditor(access)
  const integration = await integrationFor(access, studioId)
  const configuration = integration.configuration ?? {}
  if (readTargetSettings(configuration).revision !== expectedRevision) throw new MapTargetError(409, "Someone changed these circles. Reload saved circles before saving again.")
  const settings = { circles, revision: randomUUID(), updated_at: new Date().toISOString(), updated_by: access.userId }
  let query = supabase.from("studio_integrations")
    .update({ configuration: { ...configuration, map_targets: settings } })
    .eq("id", integration.id).eq("organization_id", access.organizationId).eq("studio_id", studioId)
  // Compare the full previous JSON atomically so concurrent settings edits cannot be lost.
  query = integration.configuration === null ? query.is("configuration", null) : query.eq("configuration", JSON.stringify(integration.configuration))
  const { data, error } = await query.select("id")
  if (error) throw error
  if (data?.length !== 1) throw new MapTargetError(409, "Studio settings changed while saving. Reload saved circles and try again.")
  return { circles, revision: settings.revision, canEdit: true }
}

export async function findTargetAddress(address: string) {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress")
  url.search = new URLSearchParams({ address, benchmark: "Public_AR_Current", format: "json" }).toString()
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new MapTargetError(502, "Address lookup is unavailable. Try again or enter coordinates.")
  const data = await response.json() as { result?: { addressMatches?: { matchedAddress?: string; coordinates?: { x?: number; y?: number } }[] } }
  return (data.result?.addressMatches ?? []).filter(match =>
    typeof match.matchedAddress === "string" && typeof match.coordinates?.x === "number" && typeof match.coordinates?.y === "number" &&
    Number.isFinite(match.coordinates.x) && Number.isFinite(match.coordinates.y) && Math.abs(match.coordinates.x) <= 180 && Math.abs(match.coordinates.y) <= 85
  ).slice(0, 10).map(match => ({ address: match.matchedAddress!, latitude: match.coordinates!.y!, longitude: match.coordinates!.x! }))
}
