"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getTrustedAppOrigin } from "@/lib/auth/app-origin"
import { getAuthenticatedUser, requireDashboardContext } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase/server"

export type InviteState = { complete?: boolean; error?: string } | undefined

const inviteSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  role: z.enum(["administrator", "manager", "viewer"]),
  studioIds: z.array(z.coerce.number().int().positive()).max(500),
})

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
