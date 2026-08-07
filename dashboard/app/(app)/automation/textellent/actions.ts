"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedUser, requireDashboardContext } from "@/lib/auth/session"
import { createAuthClient } from "@/lib/supabase/auth-server"
import { supabase } from "@/lib/supabase/server"

export type TextellentActionState = { complete?: boolean; error?: string } | undefined

const accountSchema = z.object({
  accountName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  senderNumber: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
  authCode: z.string().trim().min(8).max(2048),
  currentPassword: z.string().min(1).max(1024),
})

const settingsSchema = z.object({
  studioId: z.coerce.number().int().positive(),
  textellentAccountId: z.coerce.number().int().positive(),
  enabled: z.boolean(),
  minimumReservations: z.coerce.number().int().min(2).max(21),
  leadHours: z.coerce.number().int().min(1).max(48),
  earliestSendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  messageTemplate: z.string().trim().min(10).max(1000),
})

const senderSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  description: z.string().trim().max(500),
  senderNumber: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
})

const testMessageSchema = z.object({
  textellentAccountId: z.coerce.number().int().positive(),
  recipientNumber: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
  message: z.string().trim().min(1).max(1000),
  currentPassword: z.string().min(1).max(1024),
  confirmSend: z.literal("on"),
})

export async function sendTextellentTestMessage(
  _state: TextellentActionState,
  formData: FormData
): Promise<TextellentActionState> {
  const [access, user] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!user?.email || !["owner", "administrator"].includes(access.role)) {
    return { error: "Only an owner or administrator can send a Textellent test." }
  }
  const parsed = testMessageSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Select a connection, enter an E.164 test number and message, and confirm the send." }

  const auth = await createAuthClient()
  const { error: authError } = await auth.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (authError) return { error: "Your SASHA password is incorrect." }

  const { data: account, error: accountError } = await supabase
    .from("textellent_accounts")
    .select("id,sender_number")
    .eq("id", parsed.data.textellentAccountId)
    .eq("organization_id", access.organizationId)
    .eq("is_active", true)
    .maybeSingle()
  if (accountError || !account) return { error: "The selected Textellent connection is unavailable." }

  const { data: secret, error: secretError } = await supabase.rpc("get_textellent_account_secret", {
    p_account_id: account.id,
  })
  if (secretError || !secret?.authCode) return { error: "The selected Textellent credentials are unavailable." }

  const response = await fetch("https://client.textellent.com/api/v1/messages.json", {
    method: "POST",
    headers: { authCode: secret.authCode, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      text: parsed.data.message,
      from: account.sender_number,
      to: parsed.data.recipientNumber,
      ignoreQuietHours: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null)
  if (!response?.ok) return { error: "Textellent did not accept the test message." }
  const result = await response.json().catch(() => null)
  if (!result?.messageId) return { error: "Textellent did not confirm the test message." }
  return { complete: true }
}

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
    p_description: parsed.data.description,
    p_sender_number: parsed.data.senderNumber,
    p_auth_code: parsed.data.authCode,
  })
  if (error) return { error: "The encrypted Textellent account could not be saved." }
  revalidatePath("/settings")
  revalidatePath("/automation/textellent")
  return { complete: true }
}

export async function saveClassAlertSettings(_state: TextellentActionState, formData: FormData): Promise<TextellentActionState> {
  const [access, user] = await Promise.all([requireDashboardContext(), getAuthenticatedUser()])
  if (!user || !["owner", "administrator"].includes(access.role)) return { error: "Only an owner or administrator can change automation settings." }
  const parsed = settingsSchema.safeParse({
    studioId: formData.get("studioId"), textellentAccountId: formData.get("textellentAccountId"),
    enabled: formData.get("enabled") === "on", minimumReservations: formData.get("minimumReservations"),
    leadHours: formData.get("leadHours"), earliestSendTime: formData.get("earliestSendTime"), messageTemplate: formData.get("messageTemplate"),
  })
  if (!parsed.success || !access.allowedStudioIds.includes(parsed.data.studioId)) return { error: "The automation settings are invalid." }
  const { data: account } = await supabase.from("textellent_accounts").select("id").eq("id", parsed.data.textellentAccountId).eq("organization_id", access.organizationId).eq("is_active", true).maybeSingle()
  if (!account) return { error: "The selected Textellent connection is unavailable." }
  const assignment = await supabase.from("textellent_studio_assignments").upsert({ organization_id: access.organizationId, studio_id: parsed.data.studioId, textellent_account_id: account.id, updated_at: new Date().toISOString() }, { onConflict: "studio_id" })
  if (assignment.error) return { error: "The Textellent connection could not be assigned." }
  const settings = await supabase.from("low_reservation_class_alert_settings").upsert({
    organization_id: access.organizationId, studio_id: parsed.data.studioId, enabled: parsed.data.enabled,
    minimum_reservations: parsed.data.minimumReservations, lead_hours: parsed.data.leadHours,
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
  const parsed = senderSchema.safeParse({ accountId: formData.get("accountId"), description: formData.get("description"), senderNumber: formData.get("senderNumber") })
  if (!parsed.success) return { error: "Enter a valid E.164 sending number." }
  const { error } = await supabase.from("textellent_accounts").update({ description: parsed.data.description || null, sender_number: parsed.data.senderNumber, updated_at: new Date().toISOString() }).eq("id", parsed.data.accountId).eq("organization_id", access.organizationId)
  if (error) return { error: "The sending number could not be updated." }
  revalidatePath("/settings")
  revalidatePath("/automation/textellent")
  return { complete: true }
}
