import assert from "node:assert/strict"
import { test } from "node:test"
import { brokerFetch, readBrokerData } from "./broker-requests.ts"

test("a successful broker read is not retried", async () => {
  let calls = 0
  const expected = { data: [{ studio_id: 1 }], error: null }
  assert.equal(await readBrokerData(async () => { calls++; return expected }), expected)
  assert.equal(calls, 1)
})

test("a transient PGRST303 target failure recovers using a fresh query", async () => {
  let calls = 0
  const delays = []
  const expected = { data: [{ studio_id: 1 }], error: null }
  const result = await readBrokerData(async () => ++calls < 3
    ? { data: null, error: { code: "PGRST303" } }
    : expected, async ms => { delays.push(ms) })
  assert.equal(result, expected)
  assert.equal(calls, 3)
  assert.deepEqual(delays, [250, 750])
})

test("persistent token rejection fails closed after three attempts", async () => {
  let calls = 0
  const expected = { data: null, error: { code: "PGRST303" } }
  assert.equal(await readBrokerData(async () => { calls++; return expected }, async () => {}), expected)
  assert.equal(calls, 3)
})

for (const code of ["42501", "PGRST301", "PGRST205", "P0001"]) {
  test(`${code} is not mistaken for a transient token rejection`, async () => {
    let calls = 0
    const expected = { data: null, error: { code } }
    assert.equal(await readBrokerData(async () => { calls++; return expected }), expected)
    assert.equal(calls, 1)
  })
}

test("uncached fetch preserves method, body, signal and authentication", async t => {
  const signal = new AbortController().signal
  t.mock.method(globalThis, "fetch", async (input, init) => {
    assert.equal(input, "https://example.test/rest/v1/rpc/read_secret")
    assert.equal(init.cache, "no-store")
    assert.equal(init.headers.get("Cache-Control"), "no-store, no-cache")
    assert.equal(init.headers.get("Pragma"), "no-cache")
    assert.equal(init.headers.get("apikey"), "test-only")
    assert.equal(init.method, "POST")
    assert.equal(init.body, '{"p_account_id":1}')
    assert.equal(init.signal, signal)
    return new Response("{}")
  })
  await brokerFetch("https://example.test/rest/v1/rpc/read_secret", {
    method: "POST", body: '{"p_account_id":1}', signal,
    headers: { apikey: "test-only" }, cache: "force-cache",
  })
})

test("Request input headers are preserved", async t => {
  t.mock.method(globalThis, "fetch", async (_input, init) => {
    assert.equal(init.headers.get("apikey"), "test-only")
    assert.equal(init.headers.get("Accept"), "application/json")
    assert.equal(init.cache, "no-store")
    return new Response("{}")
  })
  await brokerFetch(new Request("https://example.test", { headers: { apikey: "test-only" } }), {
    headers: { Accept: "application/json" },
  })
})
