import "server-only"

import { supabase } from "@/lib/supabase/server"
import {
  getDataUploadStatus,
  type UploadFeedStatus,
  type UploadFreshness,
} from "@/lib/services/data-upload-status"

type PtsMappingConfiguration = {
  pts_account_id?: number | string
}

function configuredAccountId(configuration: unknown) {
  if (!configuration || typeof configuration !== "object") return null
  const value = (configuration as PtsMappingConfiguration).pts_account_id
  const accountId = Number(value)
  return Number.isSafeInteger(accountId) && accountId > 0 ? accountId : null
}

function feedReadyForStudio(feed: UploadFeedStatus, studioId: number) {
  const studio = feed.studios.find(candidate => candidate.id === studioId)
  return feed.freshness === "current" && Boolean(studio?.hasRows)
}

export type OnboardingFeedStatus = Pick<
  UploadFeedStatus,
  "key" | "name" | "expectedDate" | "latestBusinessDate" | "freshness"
>

export type OnboardingStudioFeedStatus = {
  key: string
  name: string
  latestBusinessDate: string | null
  freshness: UploadFreshness
  ready: boolean
}

export async function getOnboardingReadiness(organizationId: number, allowedStudioIds: number[]) {
  const [organizationResult, brandsResult, studiosResult, mappingsResult, accountsResult, membersResult, uploadStatus] =
    await Promise.all([
      supabase.from("organizations").select("id,name").eq("id", organizationId).single(),
      supabase.from("brands").select("id,name").eq("organization_id", organizationId).order("name"),
      supabase.from("studios").select("id,studio_name,studio_code,city,state,timezone,active").eq("organization_id", organizationId).in("id", allowedStudioIds).eq("active", true).order("studio_name"),
      supabase.from("studio_integrations").select("studio_id,external_id,is_active,configuration").eq("organization_id", organizationId).eq("integration_type", "pts").eq("is_active", true),
      supabase.from("pts_integration_accounts").select("id,account_name,is_active,last_validated_at").eq("organization_id", organizationId).eq("is_active", true).order("account_name"),
      supabase.from("organization_memberships").select("user_id,status").eq("organization_id", organizationId).in("status", ["invited", "active"]),
      getDataUploadStatus(organizationId, allowedStudioIds),
    ])

  for (const result of [organizationResult, brandsResult, studiosResult, mappingsResult, accountsResult, membersResult]) {
    if (result.error) throw result.error
  }

  const accountsById = new Map((accountsResult.data ?? []).map(account => [account.id, account]))
  const mappingsByStudio = new Map((mappingsResult.data ?? []).map(mapping => [mapping.studio_id, mapping]))
  const mappedStudioCounts = new Map<number, number>()

  const studios = (studiosResult.data ?? []).map(studio => {
    const mapping = mappingsByStudio.get(studio.id)
    const accountId = configuredAccountId(mapping?.configuration)
    const account = accountId ? accountsById.get(accountId) : undefined
    if (accountId) mappedStudioCounts.set(accountId, (mappedStudioCounts.get(accountId) ?? 0) + 1)

    const feeds: OnboardingStudioFeedStatus[] = uploadStatus.feeds.map(feed => ({
      key: feed.key,
      name: feed.name,
      latestBusinessDate: feed.latestBusinessDate,
      freshness: feed.freshness,
      ready: feedReadyForStudio(feed, studio.id),
    }))
    const hasPtsMapping = Boolean(mapping && account)
    const credentialsValidated = Boolean(account?.last_validated_at)

    return {
      ...studio,
      ptsLocationId: mapping?.external_id ?? null,
      ptsAccountId: accountId,
      ptsAccountName: account?.account_name ?? null,
      hasPtsMapping,
      credentialsValidated,
      feeds,
      firstRunComplete: feeds.length > 0 && feeds.every(feed => feed.ready),
    }
  })

  const accounts = (accountsResult.data ?? []).map(account => ({
    ...account,
    validated: Boolean(account.last_validated_at),
    mappedStudioCount: mappedStudioCounts.get(account.id) ?? 0,
  }))
  const activeMembers = (membersResult.data ?? []).filter(member => member.status === "active").length
  const invitedMembers = (membersResult.data ?? []).filter(member => member.status === "invited").length
  const mappedStudios = studios.filter(studio => studio.hasPtsMapping).length
  const validatedStudios = studios.filter(studio => studio.hasPtsMapping && studio.credentialsValidated).length
  const dataReadyStudios = studios.filter(studio => studio.firstRunComplete).length
  const totalStudios = studios.length
  const feedStatuses: OnboardingFeedStatus[] = uploadStatus.feeds.map(feed => ({
    key: feed.key,
    name: feed.name,
    expectedDate: feed.expectedDate,
    latestBusinessDate: feed.latestBusinessDate,
    freshness: feed.freshness,
  }))

  const checks = {
    businessStructure: (brandsResult.data?.length ?? 0) > 0 && totalStudios > 0,
    credentials: accounts.length > 0 && accounts.some(account => account.validated),
    mappings: totalStudios > 0 && mappedStudios === totalStudios && validatedStudios === totalStudios,
    users: activeMembers > 0,
    firstCollection: totalStudios > 0 && dataReadyStudios === totalStudios,
  }

  return {
    organization: organizationResult.data!,
    brands: brandsResult.data ?? [],
    studios,
    accounts,
    members: { active: activeMembers, invited: invitedMembers, total: activeMembers + invitedMembers },
    feeds: feedStatuses,
    checks,
    controlledReady: Object.values(checks).every(Boolean),
    publicEmailReady: process.env.AUTH_CUSTOM_SMTP_CONFIGURED === "true",
    checkedAt: uploadStatus.checkedAt,
    summary: { mappedStudios, validatedStudios, dataReadyStudios, totalStudios },
  }
}
