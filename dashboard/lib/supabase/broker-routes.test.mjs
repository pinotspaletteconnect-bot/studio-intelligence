import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { createRequire } from "node:module"
import vm from "node:vm"
import ts from "typescript"
import { readBrokerData } from "./broker-requests.ts"

const require = createRequire(import.meta.url)

function loadRoute(provider, overrides = {}) {
  const queries = []
  const result = (kind) => overrides[kind] ?? { data: kind === "targets" ? [{ studio_id: 1 }] : { id: 1 }, error: null }
  const client = {
    rpc(name) { queries.push(name); return Promise.resolve(result("credentials")) },
    from(name) {
      const kind = name.endsWith("targets") ? "targets" : "account"
      queries.push(name)
      const builder = {
        select() { return builder }, eq() { return builder },
        maybeSingle() { return Promise.resolve(result(kind)) },
        then(resolve, reject) { return Promise.resolve(result(kind)).then(resolve, reject) },
      }
      return builder
    },
  }
  const output = ts.transpileModule(readFileSync(new URL(`../../app/api/internal/${provider}-account/route.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(output, {
    exports, Buffer, console: { error() {} },
    process: { env: { [`${provider.toUpperCase()}_SECRET_BROKER_TOKEN`]: "test-broker-token" } },
    require(name) {
      if (name === "@/lib/supabase/broker") return { createBrokerClient: () => client }
      if (name === "@/lib/supabase/broker-requests") return { readBrokerData: read => readBrokerData(read, async () => {}) }
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } }
      return require(name)
    },
  })
  return { post: exports.POST, queries }
}

function request(body, token = "test-broker-token") {
  return new Request("https://example.test/api/internal/account", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

for (const provider of ["meta", "eulerity"]) {
  test(`${provider}: unauthorized requests never read credentials`, async () => {
    const route = loadRoute(provider)
    assert.equal((await route.post(request({ accountId: 1 }, "wrong"))).status, 401)
    assert.equal(route.queries.length, 0)
  })
  test(`${provider}: invalid account IDs never read credentials`, async () => {
    const route = loadRoute(provider)
    assert.equal((await route.post(request({ accountId: -1 }))).status, 400)
    assert.equal(route.queries.length, 0)
  })
  test(`${provider}: successful reads preserve contract and prohibit caching`, async () => {
    const response = await loadRoute(provider).post(request({ accountId: 1 }))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get("cache-control"), "no-store, private")
    assert.deepEqual(Object.keys(await response.json()).sort(), ["account", "credentials", "targets"])
  })
  test(`${provider}: target authentication failure returns 503 without secrets`, async () => {
    const route = loadRoute(provider, { targets: { data: null, error: { code: "PGRST303" } } })
    const response = await route.post(request({ accountId: 1 }))
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: "Account service temporarily unavailable" })
    assert.equal(route.queries.filter(name => name.endsWith("targets")).length, 3)
  })
  test(`${provider}: a missing account remains 404`, async () => {
    const response = await loadRoute(provider, { account: { data: null, error: null } }).post(request({ accountId: 1 }))
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { error: "Account not found" })
  })
}
