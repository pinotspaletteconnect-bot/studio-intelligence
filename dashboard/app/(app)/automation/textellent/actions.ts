"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedUser, requireDashboardContext } from "@/lib/auth/session"
import { createAuthClient } from "@/lib/supabase/auth-server"
import { supabase } from "@/lib/supabase/server"

export type TextellentActionState = { complete?: boolean; error?: string } | undefined

const accountSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  senderNumber: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
  authCode: z.string().trim().min(8).max(2048),
  currentPassword: z.string().min(1).max(1024),
})

const settingsSchema = z.object({
  studioId: z.coerce.number().int().positive(),
  textellentAccountId: z.coerce.number().int().positive(),
  enabled: z.boolean(),
  maximumReservations: z.coerce.number().int().min(1).max(20),
  leadHours: z.coerce.number().int().min(1).max(48),
  earliestSendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  messageTemplate: z.string().trim().min(10).max(1000),
})

const senderSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  senderNumber: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
})

export async function createTextellentAccount(_state: TextellentActionState, formData: FormData): Promise<TextellentActionState> {
  const [access, user] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!user?.email || !["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can add a Textellent account." }
  const parsed = accountSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Enter a label, E.164 sending number, API authentication code, and your SASHA password." }
  const auth = await createAuthClient()
  const { error: authError } = await auth.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword })
  if (authError) return { error: "Your SASHA password is incorrect." }
  const { error } = await supabase.rpc("create_textellent_account_with_secret", {
    p_organization_id: access.organizationId,
    p_account_name: parsed.data.accountName,
    p_sender_number: parsed.data.senderNumber,
    p_auth_code: parsed.data.authCode,
  })
  if (error) return { error: "The encrypted Textellent account could not be saved." }
  revalidatePath("/automation/textellent")
  return { complete: true }
}

export async function saveClassAlertSettings(_state: TextellentActionState, formData: FormData): Promise<TextellentActionState> {
  const [access, user] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!user || !["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can change automation settings." }
  const parsed = settingsSchema.safeParse({
    studioId: formData.get("studioId"), textellentAccountId: formData.get("textellentAccountId"),
    enabled: formData.get("enabled") === "on", maximumReservations: formData.get("maximumReservations"),
    leadHours: formData.get("leadHours"), earliestSendTime: formData.get("earliestSendTime"), messageTemplate: formData.get("messageTemplate"),
  })
  if (!parsed.success || !access.allowedStudioIds.includes(parsed.data.studioId)) return { error: "The automation settings are invalid." }
  const { data: account } = await supabase.from("textellent_accounts").select("id").eq("id", parsed.data.textellentAccountId).eq("organization_id", access.organizationId).eq("is_active", true).maybeSingle()
  if (!account) return { error: "The selected Textellent connection is unavailable." }
  const assignment = await supabase.from("textellent_studio_assignments").upsert({ organization_id: access.organizationId, studio_id: parsed.data.studioId, textellent_account_id: account.id, updated_at: new Date().toISOString() }, { onConflict: "studio_id" })
  if (assignment.error) return { error: "The Textellent connection could not be assigned." }
  const settings = await supabase.from("low_reservation_class_alert_settings").upsert({
    organization_id: access.organizationId, studio_id: parsed.data.studioId, enabled: parsed.data.enabled,
    maximum_reservations: parsed.data.maximumReservations, lead_hours: parsed.data.leadHours,
    earliest_send_time: parsed.data.earliestSendTime, message_template: parsed.data.messageTemplate,
    excluded_class_types: ["Private Party", "Mobile Party", "Marketing Event"],
    excluded_title_patterns: ["DIY Pop in and Paint"], updated_by: user.id, updated_at: new Date().toISOString(),
  }, { onConflict: "studio_id" })
  if (settings.error) return { error: "The automation settings could not be saved." }
  revalidatePath("/automation/textellent")
  return { complete: true }
}

export async function updateTextellentSender(_state: TextellentActionState, formData: FormData): Promise<TextellentActionState> {
  const access = await requireDashboardContext()
  if (!["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can change a sending number." }
  const parsed = senderSchema.safeParse({ accountId: formData.get("accountId"), senderNumber: formData.get("senderNumber") })
  if (!parsed.success) return { error: "Enter a valid E.164 sending number." }
  const { error } = await supabase.from("textellent_accounts").update({ sender_number: parsed.data.senderNumber, updated_at: new Date().toISOString() }).eq("id", parsed.data.accountId).eq("organization_id", access.organizationId)
  if (error) return { error: "The sending number could not be updated." }
  revalidatePath("/automation/textellent")
  return { complete: true }
}
