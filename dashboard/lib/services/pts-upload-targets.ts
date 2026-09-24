import "server-only"

import { supabase } from "@/lib/supabase/server"

// Service-to-service lookup only. The public upload route separately enforces
// organization membership and studio access before sending this source ID.
export async function resolvePtsUploadTarget(sourceCode: string, organizationId?: number, studioId?: number) {
  let query = supabase.from("studio_integrations")
    .select("organization_id,brand_id,studio_id,external_id")
    .eq("integration_type", "pts").eq("is_active", true)
    .eq("external_id", sourceCode)
  if (organizationId !== undefined && studioId !== undefined) {
    query = query.eq("organization_id", organizationId).eq("studio_id", studioId)
  }
  const { data: mappings, error } = await query.limit(2)
  if (error) throw error
  // A source location must identify exactly one destination; never pick the
  // first tenant when configuration is ambiguous.
  if (mappings?.length !== 1) return null
  const mapping = mappings[0]
  const { data: studio, error: studioError } = await supabase.from("studios")
    .select("id,studio_code,studio_name,timezone")
    .eq("id", mapping.studio_id).eq("organization_id", mapping.organization_id)
    .eq("brand_id", mapping.brand_id).eq("active", true).maybeSingle()
  if (studioError) throw studioError
  if (!studio?.studio_code || !studio.studio_name || !studio.timezone) return null
  try { new Intl.DateTimeFormat("en-US", { timeZone: studio.timezone }) }
  catch { return null }
  return {
    organizationId: mapping.organization_id,
    brandId: mapping.brand_id,
    studioId: studio.id,
    code: studio.studio_code,
    locationId: mapping.external_id,
    locationName: studio.studio_name,
    timeZone: studio.timezone,
  }
}
