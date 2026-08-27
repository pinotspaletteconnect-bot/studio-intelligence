"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedUser, requireDashboardContext } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase/server"
import { createAuthClient } from "@/lib/supabase/auth-server"

export type InviteState = { complete?: boolean; error?: string; temporaryPassword?: string } | undefined
export type AddStudioState = { complete?: boolean; error?: string } | undefined
export type MemberAccessState = { complete?: boolean; error?: string; temporaryPassword?: string } | undefined
export type PtsAccountState = { complete?: boolean; error?: string } | undefined
export type PtsReportState = { complete?: boolean; error?: string } | undefined
export type MntnConnectionState = { complete?: boolean; error?: string } | undefined
export type HomebaseConnectionState = { complete?: boolean; error?: string } | undefined
export type EulerityConnectionState = { complete?: boolean; error?: string } | undefined
export type Ga4ConnectionState = { complete?: boolean; error?: string } | undefined
export type MetaConnectionState = { complete?: boolean; error?: string } | undefined
export type QuickBooksConnectionState = { complete?: boolean; error?: string } | undefined

const inviteSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  role: z.enum(["administrator", "manager", "viewer"]),
  studioIds: z.array(z.coerce.number().int().positive()).max(500),
})

const memberAccessSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["administrator", "manager", "viewer"]),
  studioIds: z.array(z.coerce.number().int().positive()).max(500),
})

const memberTargetSchema = z.object({ userId: z.uuid() })

const TEMPORARY_PASSWORD_LIFETIME_MS = 24 * 60 * 60 * 1000

function createTemporaryPassword() {
  return `Sasha-${randomBytes(12).toString("base64url")}!7`
}

function temporaryPasswordMetadata(existing: Record<string, unknown> | undefined) {
  const issuedAt = new Date()
  return {
    ...existing,
    temporary_password_must_change: true,
    temporary_password_issued_at: issuedAt.toISOString(),
    temporary_password_expires_at: new Date(
      issuedAt.getTime() + TEMPORARY_PASSWORD_LIFETIME_MS
    ).toISOString(),
  }
}

async function findAuthUserByEmail(email: string) {
  const pageSize = 200

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    })
    if (error) throw error

    const user = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === email
    )
    if (user) return user
    if (data.users.length < pageSize) return null
  }

  throw new Error("Auth user lookup exceeded the supported page limit.")
}

const ptsAccountSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  ptsUsername: z.string().trim().min(2).max(254),
  ptsPassword: z.string().min(1).max(1024),
  currentPassword: z.string().min(1).max(1024),
})

const replacePtsCredentialsSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  ptsUsername: z.string().trim().min(2).max(254),
  ptsPassword: z.string().min(1).max(1024),
  currentPassword: z.string().min(1).max(1024),
})

const ptsReportSchema = z.object({
  integrationId: z.coerce.number().int().positive(),
  classpopEnabled: z.boolean(),
})

const mntnConnectionSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  studioId: z.coerce.number().int().positive(),
  advertiserId: z.string().trim().regex(/^\d{1,20}$/),
  apiKey: z.string().trim().min(8).max(2048),
  currentPassword: z.string().min(1).max(1024),
})

const homebaseConnectionSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  apiKey: z.string().trim().min(16).max(4096),
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(1).max(1024),
  currentPassword: z.string().min(1).max(1024),
})

const homebaseBrowserLoginSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(1).max(1024),
  currentPassword: z.string().min(1).max(1024),
})

export async function updateHomebaseBrowserLogin(
  _previousState: HomebaseConnectionState,
  formData: FormData
): Promise<HomebaseConnectionState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor?.email || !["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can update Homebase." }
  const parsed = homebaseBrowserLoginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Complete the Homebase login and security fields." }
  const auth = await createAuthClient()
  const { error: authenticationError } = await auth.auth.signInWithPassword({ email: actor.email, password: parsed.data.currentPassword })
  if (authenticationError) return { error: "Your SASHA password is incorrect." }
  const { error } = await supabase.rpc("update_homebase_browser_login", {
    p_organization_id: access.organizationId,
    p_account_id: parsed.data.accountId,
    p_email: parsed.data.email,
    p_password: parsed.data.password,
  })
  if (error) return { error: "The encrypted Homebase web login could not be updated." }
  revalidatePath("/settings")
  return { complete: true }
}

export async function createHomebaseConnection(
  _previousState: HomebaseConnectionState,
  formData: FormData
): Promise<HomebaseConnectionState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor?.email || !["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can connect Homebase." }
  const parsed = homebaseConnectionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Complete every Homebase connection and security field." }
  const mappings = access.allowedStudioIds.map(studioId => ({
    studioId,
    locationUuid: String(formData.get(`locationUuid_${studioId}`) ?? "").trim(),
  })).filter(mapping => mapping.locationUuid.length > 0)
  if (mappings.length === 0 || mappings.some(mapping => mapping.locationUuid.length > 200)) return { error: "Enter at least one valid Homebase location UUID." }
  if (new Set(mappings.map(mapping => mapping.locationUuid)).size !== mappings.length) return { error: "Each studio must use a different Homebase location UUID." }
  const auth = await createAuthClient()
  const { error: authenticationError } = await auth.auth.signInWithPassword({ email: actor.email, password: parsed.data.currentPassword })
  if (authenticationError) return { error: "Your SASHA password is incorrect." }
  const { error } = await supabase.rpc("configure_homebase_account_with_secret", {
    p_organization_id: access.organizationId, p_account_name: parsed.data.accountName,
    p_api_key: parsed.data.apiKey, p_email: parsed.data.email,
    p_password: parsed.data.password, p_mappings: mappings,
  })
  if (error) return { error: "The encrypted Homebase connection could not be saved." }
  revalidatePath("/settings")
  return { complete: true }
}

const eulerityConnectionSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(1).max(1024),
  singleStudioId: z.preprocess(value => value === "" ? null : value, z.coerce.number().int().positive().nullable()),
  currentPassword: z.string().min(1).max(1024),
})

const eulerityMappingSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  sourceKey: z.string().trim().min(1).max(500),
  studioId: z.coerce.number().int().positive(),
})

const ga4MappingSchema = z.object({ accountId: z.coerce.number().int().positive(), propertyId: z.string().regex(/^\d{1,30}$/), studioId: z.coerce.number().int().positive() })
const metaMappingSchema = z.object({ accountId: z.coerce.number().int().positive(), assetType: z.enum(["ad_account", "page", "instagram_account"]), assetId: z.string().regex(/^(act_)?\d{1,50}$/), studioId: z.coerce.number().int().positive() })
const quickbooksMappingSchema = z.object({ connectionId: z.coerce.number().int().positive(), studioId: z.coerce.number().int().positive() })

export async function assignQuickBooksConnection(
  _state: QuickBooksConnectionState,
  formData: FormData,
): Promise<QuickBooksConnectionState> {
  const access = await requireDashboardContext()
  if (!(["owner", "administrator"] as string[]).includes(access.role)) {
    return { error: "Only an owner or administrator can map QuickBooks companies." }
  }
  const parsed = quickbooksMappingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || !access.allowedStudioIds.includes(parsed.data.studioId)) {
    return { error: "Select a valid QuickBooks company and studio." }
  }

  const { data: connection, error: connectionError } = await supabase
    .from("quickbooks_connections")
    .select("id")
    .eq("id", parsed.data.connectionId)
    .eq("organization_id", access.organizationId)
    .eq("is_active", true)
    .maybeSingle()
  if (connectionError || !connection) {
    return { error: "That QuickBooks company is unavailable." }
  }

  const { error } = await supabase.rpc("assign_quickbooks_connection_to_studio", {
    p_organization_id: access.organizationId,
    p_connection_id: parsed.data.connectionId,
    p_studio_id: parsed.data.studioId,
    p_effective_from: new Date().toISOString().slice(0, 10),
  })
  if (error) return { error: "The QuickBooks studio mapping could not be saved." }

  revalidatePath("/settings")
  return { complete: true }
}

export async function mapMetaAsset(_state: MetaConnectionState, formData: FormData): Promise<MetaConnectionState> {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can map Meta assets." }
  const parsed = metaMappingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || !access.allowedStudioIds.includes(parsed.data.studioId)) return { error: "Choose an available SASHA studio." }
  const { error } = await supabase.rpc("map_meta_asset", { p_organization_id: access.organizationId, p_account_id: parsed.data.accountId, p_asset_type: parsed.data.assetType, p_asset_id: parsed.data.assetId, p_studio_id: parsed.data.studioId })
  if (error) return { error: "The Meta asset could not be mapped." }
  revalidatePath("/settings")
  return { complete: true }
}

export async function mapGa4Property(_state: Ga4ConnectionState, formData: FormData): Promise<Ga4ConnectionState> {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can map GA4 properties." }
  const parsed = ga4MappingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || !access.allowedStudioIds.includes(parsed.data.studioId)) return { error: "Choose an available SASHA studio." }
  const { error } = await supabase.rpc("map_ga4_property", { p_organization_id: access.organizationId, p_account_id: parsed.data.accountId, p_property_id: parsed.data.propertyId, p_studio_id: parsed.data.studioId })
  if (error) return { error: "The GA4 property could not be mapped." }
  revalidatePath("/settings")
  return { complete: true }
}

export async function createEulerityConnection(
  _previousState: EulerityConnectionState,
  formData: FormData
): Promise<EulerityConnectionState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor?.email || !["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can connect Eulerity." }
  const parsed = eulerityConnectionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Complete every Eulerity connection and security field." }
  if (parsed.data.singleStudioId && !access.allowedStudioIds.includes(parsed.data.singleStudioId)) return { error: "That studio is outside your access." }

  const auth = await createAuthClient()
  const { error: authenticationError } = await auth.auth.signInWithPassword({ email: actor.email, password: parsed.data.currentPassword })
  if (authenticationError) return { error: "Your SASHA password is incorrect." }

  const { error } = await supabase.rpc("create_eulerity_account_with_secret", {
    p_organization_id: access.organizationId,
    p_account_name: parsed.data.accountName,
    p_email: parsed.data.email,
    p_password: parsed.data.password,
    p_single_studio_id: parsed.data.singleStudioId,
  })
  if (error) return { error: "The encrypted Eulerity connection could not be created. Use a unique connection label." }
  revalidatePath("/settings")
  return { complete: true }
}

export async function mapEulerityLocation(
  _previousState: EulerityConnectionState,
  formData: FormData
): Promise<EulerityConnectionState> {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can map Eulerity studios." }
  const parsed = eulerityMappingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || !access.allowedStudioIds.includes(parsed.data.studioId)) return { error: "Choose an available SASHA studio." }
  const { error } = await supabase.rpc("map_eulerity_location", {
    p_organization_id: access.organizationId,
    p_account_id: parsed.data.accountId,
    p_source_key: parsed.data.sourceKey,
    p_studio_id: parsed.data.studioId,
  })
  if (error) return { error: "The Eulerity location could not be mapped." }
  revalidatePath("/settings")
  return { complete: true }
}

export async function createMntnConnection(
  _previousState: MntnConnectionState,
  formData: FormData
): Promise<MntnConnectionState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor?.email || !["owner", "administrator"].includes(access.role)) {
    return { error: "Only an owner or administrator can connect MNTN." }
  }
  const parsed = mntnConnectionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Complete every MNTN connection and security field." }
  if (!access.allowedStudioIds.includes(parsed.data.studioId)) {
    return { error: "That studio is outside your access." }
  }

  const [{ data: existingAccount }, { data: existingMapping }] = await Promise.all([
    supabase
      .from("mntn_integration_accounts")
      .select("id")
      .eq("organization_id", access.organizationId)
      .eq("account_name", parsed.data.accountName)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("studio_integrations")
      .select("studio_id,external_id,configuration")
      .eq("organization_id", access.organizationId)
      .eq("integration_type", "mntn")
      .eq("is_active", true)
      .or(`studio_id.eq.${parsed.data.studioId},external_id.eq.${parsed.data.advertiserId}`)
      .maybeSingle(),
  ])
  if (existingAccount) {
    return { error: `The connection label “${parsed.data.accountName}” is already in use. Use a label such as “Short North MNTN”.` }
  }
  const existingConfiguration = existingMapping?.configuration as Record<string, unknown> | null
  if (existingMapping && (
    existingMapping.studio_id !== parsed.data.studioId
    || existingMapping.external_id !== parsed.data.advertiserId
  )) {
    return { error: "That studio or advertiser ID already has a different active MNTN mapping." }
  }
  if (existingConfiguration?.mntn_account_id) {
    return { error: "That studio and advertiser already have a Vault-backed MNTN connection." }
  }

  const auth = await createAuthClient()
  const { error: authenticationError } = await auth.auth.signInWithPassword({
    email: actor.email,
    password: parsed.data.currentPassword,
  })
  if (authenticationError) return { error: "Your SASHA password is incorrect." }

  const { error } = await supabase.rpc("create_mntn_connection_with_secret", {
    p_organization_id: access.organizationId,
    p_account_name: parsed.data.accountName,
    p_api_key: parsed.data.apiKey,
    p_studio_id: parsed.data.studioId,
    p_advertiser_id: parsed.data.advertiserId,
  })
  if (error) {
    console.error("MNTN Vault connection creation failed", {
      organizationId: access.organizationId,
      actorId: actor.id,
      studioId: parsed.data.studioId,
      code: error.code,
    })
    return { error: "The encrypted MNTN connection could not be created. Check that the studio and advertiser are not already connected." }
  }

  revalidatePath("/settings")
  revalidatePath("/settings/onboarding")
  return { complete: true }
}

export async function setClasspopEnabled(
  _previousState: PtsReportState,
  formData: FormData
): Promise<PtsReportState> {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) {
    return { error: "Only an owner or administrator can change PTS reports." }
  }
  const parsed = ptsReportSchema.safeParse({
    integrationId: formData.get("integrationId"),
    classpopEnabled: formData.get("classpopEnabled") === "on",
  })
  if (!parsed.success) return { error: "The ClassPop setting is invalid." }

  const { data: mapping, error } = await supabase
    .from("studio_integrations")
    .select("id,configuration")
    .eq("id", parsed.data.integrationId)
    .eq("organization_id", access.organizationId)
    .eq("integration_type", "pts")
    .eq("is_active", true)
    .maybeSingle()
  if (error || !mapping) return { error: "The PTS studio mapping is unavailable." }

  const configuration = mapping.configuration && typeof mapping.configuration === "object"
    ? { ...mapping.configuration as Record<string, unknown> }
    : {}
  const existingReports = Array.isArray(configuration.reports)
    ? configuration.reports.filter((value): value is string => typeof value === "string")
    : []
  const reports = new Set(existingReports)
  if (parsed.data.classpopEnabled) reports.add("third_party_class_credits")
  else reports.delete("third_party_class_credits")

  const { error: updateError } = await supabase
    .from("studio_integrations")
    .update({ configuration: { ...configuration, reports: [...reports] } })
    .eq("id", mapping.id)
    .eq("organization_id", access.organizationId)
  if (updateError) return { error: "The ClassPop setting could not be saved." }

  revalidatePath("/settings")
  revalidatePath("/settings/onboarding")
  return { complete: true }
}

export async function replacePtsCredentials(
  _previousState: PtsAccountState,
  formData: FormData
): Promise<PtsAccountState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor?.email || !["owner", "administrator"].includes(access.role)) {
    return { error: "Only an owner or administrator can replace PTS credentials." }
  }
  const parsed = replacePtsCredentialsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Complete every credential and security field." }

  const auth = await createAuthClient()
  const { error: authenticationError } = await auth.auth.signInWithPassword({
    email: actor.email,
    password: parsed.data.currentPassword,
  })
  if (authenticationError) return { error: "Your SASHA password is incorrect." }

  const { error } = await supabase.rpc("replace_pts_account_secret", {
    p_organization_id: access.organizationId,
    p_account_id: parsed.data.accountId,
    p_username: parsed.data.ptsUsername,
    p_password: parsed.data.ptsPassword,
  })
  if (error) return { error: "The encrypted PTS credentials could not be saved." }

  revalidatePath("/settings")
  revalidatePath("/settings/onboarding")
  return { complete: true }
}

export async function createPtsAccount(
  _previousState: PtsAccountState,
  formData: FormData
): Promise<PtsAccountState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor?.email || !["owner", "administrator"].includes(access.role)) {
    return { error: "Only an owner or administrator can add a PTS account." }
  }

  const parsed = ptsAccountSchema.safeParse({
    accountName: formData.get("accountName"),
    ptsUsername: formData.get("ptsUsername"),
    ptsPassword: formData.get("ptsPassword"),
    currentPassword: formData.get("currentPassword"),
  })
  if (!parsed.success) return { error: "Complete every account and security field." }

  const auth = await createAuthClient()
  const { error: authenticationError } = await auth.auth.signInWithPassword({
    email: actor.email,
    password: parsed.data.currentPassword,
  })
  if (authenticationError) return { error: "Your SASHA password is incorrect." }

  const { data: duplicate } = await supabase
    .from("pts_integration_accounts")
    .select("id")
    .eq("organization_id", access.organizationId)
    .ilike("account_name", parsed.data.accountName)
    .maybeSingle()
  if (duplicate) return { error: "A PTS account with that label already exists." }

  const { error } = await supabase.rpc("create_pts_account_with_secret", {
    p_organization_id: access.organizationId,
    p_account_name: parsed.data.accountName,
    p_username: parsed.data.ptsUsername,
    p_password: parsed.data.ptsPassword,
  })
  if (error) {
    console.error("PTS Vault account creation failed", {
      organizationId: access.organizationId,
      actorId: actor.id,
      code: error.code,
    })
    return { error: "The encrypted PTS account could not be created." }
  }

  revalidatePath("/settings")
  revalidatePath("/settings/onboarding")
  return { complete: true }
}

async function getManageableMembership(organizationId: number, userId: string) {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("user_id,role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .in("status", ["invited", "active"])
    .maybeSingle()
  if (error) throw error
  return data
}

function canManageTarget(actorRole: string, actorId: string, target: { user_id: string; role: string }) {
  if (actorId === target.user_id || target.role === "owner") return false
  if (actorRole === "owner") return true
  return actorRole === "administrator" && ["manager", "viewer"].includes(target.role)
}

export async function updateOrganizationUserAccess(
  _previousState: MemberAccessState,
  formData: FormData
): Promise<MemberAccessState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor || !["owner", "administrator"].includes(access.role)) {
    return { error: "You do not have permission to edit users." }
  }

  const parsed = memberAccessSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    studioIds: formData.getAll("studioIds"),
  })
  if (!parsed.success) return { error: "Choose a valid role and studio access." }

  const target = await getManageableMembership(access.organizationId, parsed.data.userId)
  if (!target || !canManageTarget(access.role, actor.id, target)) {
    return { error: "That user cannot be edited by your account." }
  }
  if (access.role !== "owner" && parsed.data.role === "administrator") {
    return { error: "Only an owner can grant administrator access." }
  }
  if (parsed.data.role !== "administrator" && parsed.data.studioIds.length === 0) {
    return { error: "Managers and viewers need at least one studio." }
  }
  if (parsed.data.studioIds.some((id) => !access.allowedStudioIds.includes(id))) {
    return { error: "One or more studios are outside your access." }
  }

  const { error: membershipError } = await supabase
    .from("organization_memberships")
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq("organization_id", access.organizationId)
    .eq("user_id", target.user_id)
  if (membershipError) return { error: "The user's role could not be updated." }

  const { error: deleteError } = await supabase
    .from("user_studio_access")
    .delete()
    .eq("organization_id", access.organizationId)
    .eq("user_id", target.user_id)
  if (deleteError) return { error: "The role was updated, but studio access needs review." }

  if (parsed.data.role !== "administrator") {
    const { error: grantError } = await supabase.from("user_studio_access").insert(
      parsed.data.studioIds.map((studioId) => ({
        organization_id: access.organizationId,
        user_id: target.user_id,
        studio_id: studioId,
        granted_by: actor.id,
      }))
    )
    if (grantError) return { error: "The role was updated, but studio access needs review." }
  }

  revalidatePath("/settings")
  return { complete: true }
}

export async function suspendOrganizationUser(
  _previousState: MemberAccessState,
  formData: FormData
): Promise<MemberAccessState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor || !["owner", "administrator"].includes(access.role)) {
    return { error: "You do not have permission to remove users." }
  }
  const parsed = memberTargetSchema.safeParse({ userId: formData.get("userId") })
  if (!parsed.success) return { error: "The selected user is invalid." }

  const target = await getManageableMembership(access.organizationId, parsed.data.userId)
  if (!target || !canManageTarget(access.role, actor.id, target)) {
    return { error: "That user cannot be removed by your account." }
  }

  const { error } = await supabase
    .from("organization_memberships")
    .update({ status: "suspended", updated_at: new Date().toISOString() })
    .eq("organization_id", access.organizationId)
    .eq("user_id", target.user_id)
  if (error) return { error: "The user's access could not be removed." }

  await supabase
    .from("user_studio_access")
    .delete()
    .eq("organization_id", access.organizationId)
    .eq("user_id", target.user_id)

  revalidatePath("/settings")
  return { complete: true }
}

export async function resendOrganizationSetup(
  _previousState: MemberAccessState,
  formData: FormData
): Promise<MemberAccessState> {
  const [access, actor] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!actor || !["owner", "administrator"].includes(access.role)) {
    return { error: "You do not have permission to resend setup links." }
  }
  const parsed = memberTargetSchema.safeParse({ userId: formData.get("userId") })
  if (!parsed.success) return { error: "The selected user is invalid." }

  const target = await getManageableMembership(access.organizationId, parsed.data.userId)
  if (!target || target.status !== "invited" || !canManageTarget(access.role, actor.id, target)) {
    return { error: "A setup link cannot be sent to that account." }
  }
  const { data: targetUser, error: targetError } = await supabase.auth.admin.getUserById(target.user_id)
  if (targetError || !targetUser.user?.email) return { error: "The invited email address is unavailable." }

  const temporaryPassword = createTemporaryPassword()
  const { error } = await supabase.auth.admin.updateUserById(target.user_id, {
    password: temporaryPassword,
    app_metadata: temporaryPasswordMetadata(targetUser.user.app_metadata),
  })
  if (error) {
    console.error("Invited-user temporary password failed", {
      organizationId: access.organizationId,
      actorId: actor.id,
      targetId: target.user_id,
      code: error.code,
    })
    return { error: "A temporary password could not be issued." }
  }
  return { complete: true, temporaryPassword }
}

const addStudioSchema = z.object({
  studioName: z.string().trim().min(2).max(120),
  studioCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,20}$/),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  timezone: z.enum([
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Phoenix",
    "America/Los_Angeles",
  ]),
  brandId: z.coerce.number().int().positive(),
  ptsAccountId: z.coerce.number().int().positive(),
  ptsLocationId: z.string().trim().regex(/^\d{1,12}$/),
})

export async function addStudioWithExistingPtsAccount(
  _previousState: AddStudioState,
  formData: FormData
): Promise<AddStudioState> {
  const [access, user] = await Promise.all([
    requireDashboardContext(),
    getAuthenticatedUser(),
  ])
  if (!user || !["owner", "administrator"].includes(access.role)) {
    return { error: "Only an owner or administrator can add a studio." }
  }

  const parsed = addStudioSchema.safeParse({
    studioName: formData.get("studioName"),
    studioCode: formData.get("studioCode"),
    city: formData.get("city"),
    state: formData.get("state"),
    timezone: formData.get("timezone"),
    brandId: formData.get("brandId"),
    ptsAccountId: formData.get("ptsAccountId"),
    ptsLocationId: formData.get("ptsLocationId"),
  })
  if (!parsed.success) {
    return { error: "Complete every studio and PTS location field." }
  }

  const [{ data: brand }, { data: ptsAccount }, { data: duplicateStudio }, { data: duplicateLocation }] =
    await Promise.all([
      supabase
        .from("brands")
        .select("id")
        .eq("id", parsed.data.brandId)
        .eq("organization_id", access.organizationId)
        .maybeSingle(),
      supabase
        .from("pts_integration_accounts")
        .select("id,secret_reference")
        .eq("id", parsed.data.ptsAccountId)
        .eq("organization_id", access.organizationId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("studios")
        .select("id")
        .eq("organization_id", access.organizationId)
        .eq("studio_code", parsed.data.studioCode)
        .maybeSingle(),
      supabase
        .from("studio_integrations")
        .select("id")
        .eq("organization_id", access.organizationId)
        .eq("integration_type", "pts")
        .eq("external_id", parsed.data.ptsLocationId)
        .maybeSingle(),
    ])

  if (!brand || !ptsAccount) return { error: "The selected brand or PTS account is unavailable." }
  if (duplicateStudio) return { error: "That studio code is already in use." }
  if (duplicateLocation) return { error: "That PTS location is already mapped." }

  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .insert({
      organization_id: access.organizationId,
      brand_id: brand.id,
      studio_code: parsed.data.studioCode,
      studio_name: parsed.data.studioName,
      city: parsed.data.city,
      state: parsed.data.state,
      country: "USA",
      timezone: parsed.data.timezone,
      active: true,
    })
    .select("id")
    .single()
  if (studioError || !studio) {
    console.error("Studio onboarding insert failed", {
      organizationId: access.organizationId,
      userId: user.id,
      message: studioError?.message,
    })
    return { error: "The studio could not be added." }
  }

  const { error: integrationError } = await supabase.from("studio_integrations").insert({
    organization_id: access.organizationId,
    brand_id: brand.id,
    studio_id: studio.id,
    integration_type: "pts",
    integration_name: parsed.data.studioName,
    external_id: parsed.data.ptsLocationId,
    is_active: true,
    configuration: {
      pts_account_id: ptsAccount.id,
      credential_reference: ptsAccount.secret_reference,
      reports: ["sales", "product_sales", "class_sales", "reservations", "upcoming_classes"],
    },
  })
  if (integrationError) {
    await supabase.from("studios").delete().eq("id", studio.id).eq("organization_id", access.organizationId)
    console.error("PTS studio mapping insert failed", {
      organizationId: access.organizationId,
      studioId: studio.id,
      userId: user.id,
      message: integrationError.message,
    })
    return { error: "The PTS mapping could not be saved; the studio was not added." }
  }

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { complete: true }
}

export async function inviteOrganizationUser(
  _previousState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const [access, inviter] = await Promise.all([
    requireDashboardContext(),
    getAuthenticatedUser(),
  ])
  if (!inviter || !["owner", "administrator"].includes(access.role)) {
    return { error: "Only an owner or administrator can invite users." }
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    studioIds: formData.getAll("studioIds"),
  })
  if (!parsed.success) return { error: "Enter a valid invitation and role." }

  if (
    parsed.data.role !== "administrator" &&
    parsed.data.studioIds.length === 0
  ) {
    return { error: "Managers and viewers need at least one studio." }
  }
  if (parsed.data.studioIds.some((id) => !access.allowedStudioIds.includes(id))) {
    return { error: "One or more studios are outside your access." }
  }

  const temporaryPassword = createTemporaryPassword()
  const temporaryMetadata = temporaryPasswordMetadata({
    invited_to_organization: access.organizationId,
  })

  // Provision the identity with an owner-delivered, short-lived temporary
  // password. The readable value is returned once and is never stored by SASHA.
  const { data, error: inviteError } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    password: temporaryPassword,
    user_metadata: { invited_to_organization: access.organizationId },
    app_metadata: temporaryMetadata,
  })
  let invitedUser = data.user

  if (inviteError || !invitedUser) {
    let existingUser
    try {
      existingUser = await findAuthUserByEmail(parsed.data.email)
    } catch (error) {
      console.error("Existing invitation lookup failed", {
        organizationId: access.organizationId,
        inviterId: inviter.id,
        error,
      })
      return { error: "The invitation could not be sent." }
    }

    if (!existingUser) {
      console.error("Organization invitation failed", {
        organizationId: access.organizationId,
        inviterId: inviter.id,
        message: inviteError?.message,
      })
      return { error: "The invitation could not be sent." }
    }

    const { data: existingMembership, error: membershipLookupError } = await supabase
      .from("organization_memberships")
      .select("status")
      .eq("organization_id", access.organizationId)
      .eq("user_id", existingUser.id)
      .maybeSingle()

    if (
      membershipLookupError ||
      !existingMembership ||
      !["invited", "suspended"].includes(existingMembership.status)
    ) {
      return {
        error: existingMembership?.status === "active"
          ? "This user already has active access. Manage them under Authorized Users."
          : "This email already has an account and cannot be invited from this workspace.",
      }
    }

    invitedUser = existingUser

    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      invitedUser.id,
      {
        password: temporaryPassword,
        app_metadata: temporaryPasswordMetadata(invitedUser.app_metadata),
      }
    )
    if (passwordError) {
      return { error: "The existing invited account could not receive a temporary password." }
    }
  }

  const { error: membershipError } = await supabase
    .from("organization_memberships")
    .upsert({
      organization_id: access.organizationId,
      user_id: invitedUser.id,
      role: parsed.data.role,
      status: "invited",
      invited_by: inviter.id,
      joined_at: null,
      updated_at: new Date().toISOString(),
    })
  if (membershipError) {
    console.error("Invitation membership assignment failed", {
      organizationId: access.organizationId,
      invitedUserId: invitedUser.id,
      message: membershipError.message,
    })
    return { error: "The invitation was sent, but access assignment needs review." }
  }

  const { error: accessResetError } = await supabase
    .from("user_studio_access")
    .delete()
    .eq("organization_id", access.organizationId)
    .eq("user_id", invitedUser.id)
  if (accessResetError) {
    return { error: "The invitation was sent, but existing studio access could not be reset." }
  }

  if (parsed.data.role !== "administrator") {
    const { error: studioError } = await supabase.from("user_studio_access").insert(
      parsed.data.studioIds.map((studioId) => ({
        organization_id: access.organizationId,
        user_id: invitedUser.id,
        studio_id: studioId,
        granted_by: inviter.id,
      }))
    )
    if (studioError) return { error: "The invitation was sent, but studio access needs review." }
  }

  revalidatePath("/settings")
  return { complete: true, temporaryPassword }
}
