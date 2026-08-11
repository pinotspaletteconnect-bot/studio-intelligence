import "server-only"

import { supabase } from "@/lib/supabase/server"

export async function getPtsBackfillStudios(organizationId: number, allowedStudioIds: number[]) {
  const [studiosResult, mappingsResult] = await Promise.all([
    supabase.from("studios").select("id,studio_name").eq("organization_id", organizationId).in("id", allowedStudioIds).eq("active", true).order("studio_name"),
    supabase.from("studio_integrations").select("studio_id,external_id").eq("organization_id", organizationId).in("studio_id", allowedStudioIds).eq("integration_type", "pts").eq("is_active", true),
  ])
  if (studiosResult.error) throw studiosResult.error
  if (mappingsResult.error) throw mappingsResult.error
  const mappedIds = new Set((mappingsResult.data ?? []).filter((mapping) => mapping.external_id).map((mapping) => mapping.studio_id))
  return (studiosResult.data ?? []).filter((studio) => mappedIds.has(studio.id))
}

export async function getPtsBackfillTarget(organizationId: number, studioId: number) {
  const { data, error } = await supabase
    .from("studio_integrations")
    .select("external_id")
    .eq("organization_id", organizationId)
    .eq("studio_id", studioId)
    .eq("integration_type", "pts")
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  return data?.external_id ? { studioCode: data.external_id } : null
}
