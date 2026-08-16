import "server-only"

import { supabase } from "@/lib/supabase/server"

export const strategyChangeTypes = [
  "budget",
  "targeting",
  "creative",
  "bidding",
  "campaign_structure",
  "offer",
  "other",
] as const

export type StrategyChangeType = (typeof strategyChangeTypes)[number]

export type MarketingStrategyChange = {
  id: number
  effectiveDate: string
  changeType: StrategyChangeType
  title: string
  notes: string | null
  studioId: number | null
  studioName: string | null
}

type StrategyChangeRow = {
  id: number
  effective_date: string
  change_type: StrategyChangeType
  title: string
  notes: string | null
  studio_id: number | null
}

export async function getMarketingStrategyChanges(
  organizationId: number,
  allowedStudioIds: number[],
  startDate: string,
  endDate: string,
  studioId?: string
): Promise<MarketingStrategyChange[]> {
  const [{ data, error }, { data: studios, error: studiosError }] =
    await Promise.all([
      supabase
        .from("marketing_strategy_changes")
        .select("id,effective_date,change_type,title,notes,studio_id")
        .eq("organization_id", organizationId)
        .eq("platform", "eulerity")
        .gte("effective_date", startDate)
        .lte("effective_date", endDate)
        .order("effective_date")
        .order("created_at"),
      supabase
        .from("studios")
        .select("id,studio_name")
        .eq("organization_id", organizationId)
        .in("id", allowedStudioIds),
    ])

  if (error) throw error
  if (studiosError) throw studiosError

  const requestedStudioId = studioId && studioId !== "all" ? Number(studioId) : null
  const allowed = new Set(allowedStudioIds)
  const studioNames = new Map(
    (studios ?? []).map((studio) => [Number(studio.id), studio.studio_name])
  )

  return ((data ?? []) as StrategyChangeRow[])
    .filter(
      (change) =>
        change.studio_id == null ||
        (allowed.has(change.studio_id) &&
          (requestedStudioId == null || change.studio_id === requestedStudioId))
    )
    .map((change) => ({
      id: change.id,
      effectiveDate: change.effective_date,
      changeType: change.change_type,
      title: change.title,
      notes: change.notes,
      studioId: change.studio_id,
      studioName:
        change.studio_id == null
          ? null
          : studioNames.get(change.studio_id) ?? `Studio ${change.studio_id}`,
    }))
}

export async function createMarketingStrategyChange(input: {
  organizationId: number
  studioId: number | null
  effectiveDate: string
  changeType: StrategyChangeType
  title: string
  notes?: string | null
  createdBy: string
}): Promise<MarketingStrategyChange> {
  const { data, error } = await supabase
    .from("marketing_strategy_changes")
    .insert({
      organization_id: input.organizationId,
      studio_id: input.studioId,
      platform: "eulerity",
      effective_date: input.effectiveDate,
      change_type: input.changeType,
      title: input.title,
      notes: input.notes || null,
      created_by: input.createdBy,
    })
    .select("id,effective_date,change_type,title,notes,studio_id")
    .single()

  if (error) throw error

  let studioName: string | null = null
  if (data.studio_id != null) {
    const { data: studio, error: studioError } = await supabase
      .from("studios")
      .select("studio_name")
      .eq("organization_id", input.organizationId)
      .eq("id", data.studio_id)
      .single()
    if (studioError) throw studioError
    studioName = studio.studio_name
  }

  return {
    id: data.id,
    effectiveDate: data.effective_date,
    changeType: data.change_type as StrategyChangeType,
    title: data.title,
    notes: data.notes,
    studioId: data.studio_id,
    studioName,
  }
}

export async function deleteMarketingStrategyChange(
  organizationId: number,
  id: number
) {
  const { error } = await supabase
    .from("marketing_strategy_changes")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", id)

  if (error) throw error
}
