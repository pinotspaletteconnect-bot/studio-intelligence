import "server-only"

import { createClient } from "@supabase/supabase-js"
import { brokerFetch } from "./broker-requests"

/** Keep service credentials isolated from user sessions and other requests. */
export function createBrokerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVER_SECRET!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: brokerFetch },
    },
  )
}
