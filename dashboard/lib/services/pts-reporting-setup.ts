import "server-only"

import { supabase } from "@/lib/supabase/server"

/** Copy established reporting rules for the same brand when a PTS studio is connected. */
export async function ensurePtsReportingMappings(organizationId: number, brandId: number) {
  const [products, classes] = await Promise.all([
    supabase.from("pts_product_reporting_mappings")
      .select("source_field,source_value")
      .eq("organization_id", organizationId),
    supabase.from("pts_class_type_mappings")
      .select("source_class_type")
      .eq("organization_id", organizationId),
  ])
  if (products.error || classes.error) throw products.error ?? classes.error
  if (products.data.length && classes.data.length) return

  const { data: brand, error: brandError } = await supabase.from("brands")
    .select("name").eq("id", brandId).eq("organization_id", organizationId).single()
  if (brandError || !brand) throw brandError ?? new Error("PTS brand not found")

  const { data: peerBrands, error: peerError } = await supabase.from("brands")
    .select("organization_id").eq("name", brand.name)
    .neq("organization_id", organizationId).limit(100)
  if (peerError) throw peerError
  const peerIds = [...new Set((peerBrands ?? []).map((peer) => peer.organization_id))]
  if (!peerIds.length) throw new Error("No reporting template exists for this brand")

  const [peerProducts, peerClasses] = await Promise.all([
    supabase.from("pts_product_reporting_mappings")
      .select("organization_id,source_field,source_value,product_group,department,priority,is_active")
      .in("organization_id", peerIds).eq("is_active", true).limit(1000),
    supabase.from("pts_class_type_mappings")
      .select("organization_id,source_class_type,reporting_class_type,is_active")
      .in("organization_id", peerIds).eq("is_active", true).limit(1000),
  ])
  if (peerProducts.error || peerClasses.error) throw peerProducts.error ?? peerClasses.error

  const templateId = peerIds
    .filter((id) => peerProducts.data.some((row) => row.organization_id === id)
      && peerClasses.data.some((row) => row.organization_id === id))
    .sort((a, b) => {
      const count = (id: number) => peerProducts.data.filter((row) => row.organization_id === id).length
        + peerClasses.data.filter((row) => row.organization_id === id).length
      return count(b) - count(a) || a - b
    })[0]
  if (!templateId) throw new Error("No complete reporting template exists for this brand")

  if (!products.data.length) {
    const rows = peerProducts.data.filter((row) => row.organization_id === templateId)
      .map(({ source_field, source_value, product_group, department, priority }) => ({
        organization_id: organizationId, source_field, source_value,
        product_group, department, priority,
      }))
    const { error } = await supabase.from("pts_product_reporting_mappings")
      .upsert(rows, { onConflict: "organization_id,source_field,source_value", ignoreDuplicates: true })
    if (error) throw error
  }
  if (!classes.data.length) {
    const rows = peerClasses.data.filter((row) => row.organization_id === templateId)
      .map(({ source_class_type, reporting_class_type }) => ({
        organization_id: organizationId, source_class_type, reporting_class_type,
      }))
    const { error } = await supabase.from("pts_class_type_mappings")
      .upsert(rows, { onConflict: "organization_id,source_class_type", ignoreDuplicates: true })
    if (error) throw error
  }
}
