const RETRYABLE_STATUS_CODES = new Set([408, 429])
const RETRY_DELAY_MS = 350

function isRetryable(response: Response) {
  return RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500
}

function wait(signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("The request was aborted.", "AbortError"))
      return
    }

    const onAbort = () => {
      clearTimeout(timeout)
      reject(signal?.reason ?? new DOMException("The request was aborted.", "AbortError"))
    }
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, RETRY_DELAY_MS)
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase()
  if (method !== "GET" && method !== "HEAD") return fetch(input, init)

  try {
    const response = await fetch(input, init)
    if (!isRetryable(response)) return response
    await response.body?.cancel()
  } catch (error) {
    if (init?.signal?.aborted) throw error
  }

  await wait(init?.signal)
  return fetch(input, init)
}
