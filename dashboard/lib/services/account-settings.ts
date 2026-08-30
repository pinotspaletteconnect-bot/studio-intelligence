import "server-only"

import { supabase } from "@/lib/supabase/server"

export async function getAccountSettings(
  organizationId: number,
  allowedStudioIds: number[]
) {
  const [membershipResult, studioResult, integrationResult, mappingResult, brandResult, ptsAccountResult, textellentAccountResult, mntnAccountResult, homebaseAccountResult, eulerityAccountResult, eulerityLocationResult, ga4AccountResult, ga4PropertyResult, metaAccountResult, metaAssetResult, accountingEmailResult] =
    await Promise.all([
      supabase
        .from("organization_memberships")
        .select("user_id,role,status,joined_at,created_at")
        .eq("organization_id", organizationId)
        .in("status", ["invited", "active"])
        .order("created_at"),
      supabase
        .from("studios")
        .select("id,studio_name")
        .eq("organization_id", organizationId)
        .in("id", allowedStudioIds)
        .order("studio_name"),
      supabase
        .from("integration_secret_references")
        .select(
          "id,studio_id,integration_type,account_label,secret_provider,connection_status,last_validated_at"
        )
        .eq("organization_id", organizationId)
        .order("account_label"),
      supabase
        .from("studio_integrations")
        .select("id,studio_id,integration_type,external_id,configuration")
        .eq("organization_id", organizationId)
        .in("studio_id", allowedStudioIds)
        .eq("is_active", true),
      supabase
        .from("brands")
        .select("id,name")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase
        .from("pts_integration_accounts")
        .select("id,account_name,secret_provider,secret_reference,is_active,last_validated_at")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("account_name"),
      supabase
        .from("textellent_accounts")
        .select("id,account_name,description,sender_number,is_active,last_validated_at")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("account_name"),
      supabase
        .from("mntn_integration_accounts")
        .select("id,account_name,secret_reference,is_active,last_validated_at")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("account_name"),
      supabase.from("homebase_integration_accounts").select("id,studio_id,account_name,location_name,secret_reference,last_validated_at").eq("organization_id", organizationId).eq("is_active", true).order("account_name"),
      supabase.from("eulerity_integration_accounts").select("id,account_name,secret_reference,single_studio_id,last_discovered_at,last_validated_at").eq("organization_id", organizationId).eq("is_active", true).order("account_name"),
      supabase.from("eulerity_source_locations").select("account_id,source_key,display_name").eq("organization_id", organizationId).eq("is_active", true).order("display_name"),
      supabase.from("ga4_integration_accounts").select("id,account_name,authentication_type,google_account_email,secret_reference,last_discovered_at,last_validated_at").eq("organization_id", organizationId).eq("is_active", true).order("account_name"),
      supabase.from("ga4_source_properties").select("account_id,property_id,display_name,account_display_name").eq("organization_id", organizationId).eq("is_active", true).order("display_name"),
      supabase.from("meta_integration_accounts").select("id,account_name,meta_user_name,secret_reference,connection_status,token_expires_at,last_discovered_at,last_validated_at").eq("organization_id", organizationId).eq("is_active", true).order("account_name"),
      supabase.from("meta_source_assets").select("account_id,asset_type,asset_id,display_name").eq("organization_id", organizationId).eq("is_active", true).order("display_name"),
      supabase.from("accounting_email_connections").select("id,connection_name,account_email,secret_reference,connection_status,last_received_at,last_validated_at").eq("organization_id", organizationId).eq("provider", "gmail").eq("is_active", true).order("connection_name"),
    ])

  for (const result of [membershipResult, studioResult, integrationResult, mappingResult, brandResult, ptsAccountResult, textellentAccountResult, mntnAccountResult, homebaseAccountResult, eulerityAccountResult, eulerityLocationResult, ga4AccountResult, ga4PropertyResult, metaAccountResult, metaAssetResult, accountingEmailResult]) {
    if (result.error) throw result.error
  }

  const memberIds = (membershipResult.data ?? []).map((membership) => membership.user_id)
  const profileResult = memberIds.length
    ? await supabase
        .from("user_profiles")
        .select("user_id,full_name")
        .in("user_id", memberIds)
    : { data: [], error: null }
  if (profileResult.error) throw profileResult.error

  const profiles = new Map(
    (profileResult.data ?? []).map((profile) => [profile.user_id, profile.full_name])
  )

  const [authUsers, studioAccessResult] = await Promise.all([
    Promise.all(
      memberIds.map(async (userId) => {
        const { data, error } = await supabase.auth.admin.getUserById(userId)
        if (error) throw error
        return [userId, data.user.email ?? ""] as const
      })
    ),
    memberIds.length
      ? supabase
          .from("user_studio_access")
          .select("user_id,studio_id")
          .eq("organization_id", organizationId)
          .in("user_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (studioAccessResult.error) throw studioAccessResult.error

  const emails = new Map(authUsers)
  const studioIdsByUser = new Map<string, number[]>()
  for (const grant of studioAccessResult.data ?? []) {
    const studioIds = studioIdsByUser.get(grant.user_id) ?? []
    studioIds.push(grant.studio_id)
    studioIdsByUser.set(grant.user_id, studioIds)
  }

  return {
    members: (membershipResult.data ?? []).map((membership) => ({
      ...membership,
      name: profiles.get(membership.user_id) ?? "Invited user",
      email: emails.get(membership.user_id) ?? "",
      studioIds: studioIdsByUser.get(membership.user_id) ?? [],
    })),
    studios: studioResult.data ?? [],
    integrations: integrationResult.data ?? [],
    mappedIntegrationTypes: [...new Set((mappingResult.data ?? []).map((item) => item.integration_type))],
    ptsStudioSettings: (mappingResult.data ?? [])
      .filter((item) => item.integration_type === "pts")
      .map((item) => ({
        integrationId: item.id,
        studioId: item.studio_id,
        classpopEnabled: Array.isArray((item.configuration as { reports?: unknown } | null)?.reports)
          && ((item.configuration as { reports: unknown[] }).reports).includes("third_party_class_credits"),
      })),
    brands: brandResult.data ?? [],
    ptsAccounts: (ptsAccountResult.data ?? []).map((account) => ({
      id: account.id,
      account_name: account.account_name,
      has_credentials: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.secret_reference),
      last_validated_at: account.last_validated_at,
    })),
    textellentAccounts: textellentAccountResult.data ?? [],
    mntnAccounts: (mntnAccountResult.data ?? []).map((account) => {
      const mapping = (mappingResult.data ?? []).find((item) =>
        item.integration_type === "mntn"
        && String((item.configuration as { mntn_account_id?: unknown } | null)?.mntn_account_id ?? "") === String(account.id)
      )
      const studio = (studioResult.data ?? []).find((item) => item.id === mapping?.studio_id)
      return {
        id: account.id,
        account_name: account.account_name,
        advertiser_id: mapping?.external_id ?? null,
        studio_name: studio?.studio_name ?? null,
        has_credentials: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.secret_reference),
        last_validated_at: account.last_validated_at,
      }
    }),
    homebaseAccounts: (homebaseAccountResult.data ?? []).map(account => ({
      id: account.id,
      account_name: account.account_name,
      studio_name: (studioResult.data ?? []).find(studio => studio.id === account.studio_id)?.studio_name ?? null,
      location_name: account.location_name,
      has_credentials: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.secret_reference),
      last_validated_at: account.last_validated_at,
    })),
    eulerityAccounts: (eulerityAccountResult.data ?? []).map(account => ({
      ...account,
      has_credentials: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.secret_reference),
      locations: (eulerityLocationResult.data ?? []).filter(location => location.account_id === account.id).map(location => {
        const mapping = (mappingResult.data ?? []).find(item => item.integration_type === "eulerity" && String((item.configuration as { eulerity_account_id?: unknown; selector_key?: unknown } | null)?.eulerity_account_id ?? "") === String(account.id) && (item.configuration as { selector_key?: unknown } | null)?.selector_key === location.source_key)
        return { ...location, studio_id: mapping?.studio_id ?? null, studio_name: (studioResult.data ?? []).find(studio => studio.id === mapping?.studio_id)?.studio_name ?? null }
      }),
    })),
    ga4Accounts: (ga4AccountResult.data ?? []).map(account => ({
      ...account,
      has_credentials: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.secret_reference),
      properties: (ga4PropertyResult.data ?? []).filter(property => property.account_id === account.id).map(property => {
        const mapping = (mappingResult.data ?? []).find(item => item.integration_type === "ga4" && item.external_id === property.property_id && String((item.configuration as { ga4_account_id?: unknown } | null)?.ga4_account_id ?? "") === String(account.id))
        return { ...property, studio_id: mapping?.studio_id ?? null, studio_name: (studioResult.data ?? []).find(studio => studio.id === mapping?.studio_id)?.studio_name ?? null }
      }),
    })),
    accountingGmailAccounts: (accountingEmailResult.data ?? []).map(account => ({
      ...account,
      has_credentials: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.secret_reference),
    })),
    metaAccounts: (metaAccountResult.data ?? []).map(account => ({
      ...account,
      has_credentials: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.secret_reference),
      assets: (metaAssetResult.data ?? []).filter(asset => asset.account_id === account.id).map(asset => {
        const integrationType = asset.asset_type === "ad_account" ? "meta_ads" : asset.asset_type === "page" ? "meta_page" : asset.asset_type === "instagram_account" ? "meta_instagram" : null
        const mapping = integrationType ? (mappingResult.data ?? []).find(item => item.integration_type === integrationType && item.external_id === asset.asset_id && String((item.configuration as { meta_account_id?: unknown } | null)?.meta_account_id ?? "") === String(account.id)) : null
        return { ...asset, studio_id: mapping?.studio_id ?? null, studio_name: (studioResult.data ?? []).find(studio => studio.id === mapping?.studio_id)?.studio_name ?? null }
      }),
    })),
  }
}
