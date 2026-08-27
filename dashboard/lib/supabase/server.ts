import "server-only"

import { createClient } from "@supabase/supabase-js"

const RETRYABLE_STATUS_CODES = new Set([408, 429])
const WAREHOUSE_RETRY_DELAY_MS = 250

function isRetryableResponse(response: Response) {
  return RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500
}

function waitForRetry(signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("The request was aborted.", "AbortError"))
      return
    }

    const onAbort = () => {
      clearTimeout(timeout)
      reject(signal?.reason ?? new DOMException("The request was aborted.", "AbortError"))
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, WAREHOUSE_RETRY_DELAY_MS)
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

async function fetchWarehouse(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
  if (method !== "GET" && method !== "HEAD") return fetch(input, init)

  try {
    const response = await fetch(input, init)
    if (!isRetryableResponse(response)) return response
  } catch (error) {
    if (init?.signal?.aborted) throw error
  }

  await waitForRetry(init?.signal)
  return fetch(input, init)
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVER_SECRET!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWarehouse,
    },
  }
)
