import "server-only"

import { createClient } from "@supabase/supabase-js"

import { getSupabasePublicConfig } from "@/lib/supabase/config"

export function createRecoveryEmailClient() {
  const { url, publishableKey } = getSupabasePublicConfig()

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
      persistSession: false,
    },
  })
}
