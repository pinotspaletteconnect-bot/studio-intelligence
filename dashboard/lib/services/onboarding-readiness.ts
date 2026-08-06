import "server-only"

import { supabase } from "@/lib/supabase/server"

type SourceKey = "dailySales" | "products" | "classes" | "upcoming" | "reservations"

const sources: Array<{ key: SourceKey; table: string; dateColumn: string }> = [
  { key: "dailySales", table: "pts_sales_daily_summary", dateColumn: "report_date" },
  { key: "products", table: "pts_non_class_sales_items", dateColumn: "report_date" },
  { key: "classes", table: "pts_class_sales_daily", dateColumn: "event_date" },
  { key: "upcoming", table: "pts_upcoming_class_snapshots", dateColumn: "snapshot_date" },
  { key: "reservations", table: "pts_reservation_bookings", dateColumn: "order_date" },
]

async function getLatestSourceDate(table: string, dateColumn: string, studioId: number) {
  const { data, error } = await supabase
    .from(table)
    .select(dateColumn)
    .eq("studio_id", studioId)
    .order(dateColumn, { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const value = (data as Record<string, unknown> | null)?.[dateColumn]
  return typeof value === "string" ? value : null
}

export async function getOnboardingReadiness(organizationId: number, allowedStudioIds: number[]) {
  const [organizationResult, brandsResult, studiosResult, mappingsResult, accountsResult, membersResult] =
    await Promise.all([
      supabase.from("organizations").select("id,name").eq("id", organizationId).single(),
      supabase.from("brands").select("id,name").eq("organization_id", organizationId).order("name"),
      supabase.from("studios").select("id,studio_name,studio_code,city,state,timezone,active").eq("organization_id", organizationId).in("id", allowedStudioIds).eq("active", true).order("studio_name"),
      supabase.from("studio_integrations").select("studio_id,external_id,is_active").eq("organization_id", organizationId).eq("integration_type", "pts").eq("is_active", true),
      supabase.from("pts_integration_accounts").select("id,account_name,is_active,last_validated_at").eq("organization_id", organizationId).eq("is_active", true).order("account_name"),
      supabase.from("organization_memberships").select("user_id,status").eq("organization_id", organizationId).in("status", ["invited", "active"]),
    ])

  for (const result of [organizationResult, brandsResult, studiosResult, mappingsResult, accountsResult, membersResult]) {
    if (result.error) throw result.error
  }

  const mappingsByStudio = new Map((mappingsResult.data ?? []).map((mapping) => [mapping.studio_id, mapping]))
  const studios = await Promise.all((studiosResult.data ?? []).map(async (studio) => {
    const latestEntries = await Promise.all(sources.map(async (source) => [
      source.key,
      await getLatestSourceDate(source.table, source.dateColumn, studio.id),
    ] as const))
    const mapping = mappingsByStudio.get(studio.id)
    return {
      ...studio,
      ptsLocationId: mapping?.external_id ?? null,
      hasPtsMapping: Boolean(mapping),
      latest: Object.fromEntries(latestEntries) as Record<SourceKey, string | null>,
    }
  }))

  const mappedStudios = studios.filter((studio) => studio.hasPtsMapping).length
  const dataReadyStudios = studios.filter((studio) => Object.values(studio.latest).every(Boolean)).length

  return {
    organization: organizationResult.data!,
    brands: brandsResult.data ?? [],
    studios,
    accounts: accountsResult.data ?? [],
    memberCount: membersResult.data?.length ?? 0,
    summary: { mappedStudios, dataReadyStudios, totalStudios: studios.length },
  }
}
