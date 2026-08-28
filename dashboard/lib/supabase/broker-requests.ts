type BrokerResult = { error: { code?: string } | null }

/** Broker reads must never reuse a cached credential or mapping response. */
export const brokerFetch: typeof fetch = (input, init) => {
  const headers = new Headers(input instanceof Request ? input.headers : undefined)
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value))
  headers.set("Cache-Control", "no-store, no-cache")
  headers.set("Pragma", "no-cache")
  return fetch(input, { ...init, headers, cache: "no-store" })
}

/** Retry only the observed transient JWT-claims rejection, never writes. */
export async function readBrokerData<T extends BrokerResult>(
  read: () => PromiseLike<T>,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  const delays = [250, 750]
  for (let attempt = 0; ; attempt++) {
    const result = await read()
    if (result.error?.code !== "PGRST303" || attempt >= delays.length) return result
    // Do not log response bodies: credential RPCs return secrets.
    console.warn("Broker read JWT validation retry", { attempt: attempt + 1, code: "PGRST303" })
    await wait(delays[attempt])
  }
}
