"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { getAuthenticatedUser, requireDashboardContext } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase/server"

export type InviteState = { complete?: boolean; error?: string } | undefined
export type AddStudioState = { complete?: boolean; error?: string } | undefined

const inviteSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  role: z.enum(["administrator", "manager", "viewer"]),
  studioIds: z.array(z.coerce.number().int().positive()).max(500),
})

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
