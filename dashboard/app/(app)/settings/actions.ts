"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { getAuthenticatedUser, requireDashboardContext } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase/server"
import { createAuthClient } from "@/lib/supabase/auth-server"

export type InviteState = { complete?: boolean; error?: string } | undefined
export type AddStudioState = { complete?: boolean; error?: string } | undefined
export type MemberAccessState = { complete?: boolean; error?: string } | undefined
export type PtsAccountState = { complete?: boolean; error?: string } | undefined

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

const ptsAccountSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  ptsUsername: z.string().trim().min(2).max(254),
  ptsPassword: z.string().min(1).max(1024),
  currentPassword: z.string().min(1).max(1024),
})

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

  let origin: string
  try {
    origin = getTrustedAppOrigin((await headers()).get("origin"))
  } catch (error) {
    console.error("Setup-link origin is not configured", error)
    return { error: "Setup links are temporarily unavailable." }
  }

  const auth = await createAuthClient()
  const { error } = await auth.auth.resetPasswordForEmail(targetUser.user.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })
  if (error) {
    console.error("Invited-user setup link failed", {
      organizationId: access.organizationId,
      actorId: actor.id,
      targetId: target.user_id,
      code: error.code,
    })
    return { error: "The setup email could not be sent." }
  }
  return { complete: true }
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

  let origin: string
  try {
    origin = getTrustedAppOrigin((await headers()).get("origin"))
  } catch (error) {
    console.error("Invitation origin is not configured", error)
    return { error: "Invitations are temporarily unavailable." }
  }

  const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: { invited_to_organization: access.organizationId },
    }
  )
  if (inviteError || !data.user) {
    console.error("Organization invitation failed", {
      organizationId: access.organizationId,
      inviterId: inviter.id,
      message: inviteError?.message,
    })
    return { error: "The invitation could not be sent." }
  }

  const { error: membershipError } = await supabase
    .from("organization_memberships")
    .upsert({
      organization_id: access.organizationId,
      user_id: data.user.id,
      role: parsed.data.role,
      status: "invited",
      invited_by: inviter.id,
      updated_at: new Date().toISOString(),
    })
  if (membershipError) {
    console.error("Invitation membership assignment failed", {
      organizationId: access.organizationId,
      invitedUserId: data.user.id,
      message: membershipError.message,
    })
    return { error: "The invitation was sent, but access assignment needs review." }
  }

  if (parsed.data.role !== "administrator") {
    const { error: studioError } = await supabase.from("user_studio_access").insert(
      parsed.data.studioIds.map((studioId) => ({
        organization_id: access.organizationId,
        user_id: data.user.id,
        studio_id: studioId,
        granted_by: inviter.id,
      }))
    )
    if (studioError) return { error: "The invitation was sent, but studio access needs review." }
  }

  revalidatePath("/settings")
  return { complete: true }
}
