import "server-only"

import { supabase } from "@/lib/supabase/server"

export async function getTextellentAutomation(organizationId: number, studioIds: number[]) {
  const [studiosResult, accountsResult, assignmentsResult, settingsResult, deliveriesResult] = await Promise.all([
    supabase.from("studios").select("id,studio_name,timezone").eq("organization_id", organizationId).in("id", studioIds).eq("active", true).order("studio_name"),
    supabase.from("textellent_accounts").select("id,account_name,sender_number,is_active,last_validated_at").eq("organization_id", organizationId).order("account_name"),
    supabase.from("textellent_studio_assignments").select("studio_id,textellent_account_id").eq("organization_id", organizationId).in("studio_id", studioIds),
    supabase.from("low_reservation_class_alert_settings").select("studio_id,enabled,maximum_reservations,lead_hours,earliest_send_time,message_template,excluded_class_types,excluded_title_patterns,updated_at").eq("organization_id", organizationId).in("studio_id", studioIds),
    supabase.from("low_reservation_class_alert_deliveries").select("id,studio_id,source_class_id,class_starts_at,reservation_count,recipient_count,status,attempted_at").eq("organization_id", organizationId).in("studio_id", studioIds).order("attempted_at", { ascending: false }).limit(25),
  ])
  for (const result of [studiosResult, accountsResult, assignmentsResult, settingsResult, deliveriesResult]) {
    if (result.error) throw result.error
  }
  return {
    studios: studiosResult.data ?? [],
    accounts: accountsResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    settings: settingsResult.data ?? [],
    deliveries: deliveriesResult.data ?? [],
  }
}
