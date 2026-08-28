import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { test } from "node:test"

// Next.js supplies this marker in production; the standalone Node test needs
// only its no-op server implementation. All application code runs unchanged.
registerHooks({ resolve(specifier, context, nextResolve) {
  return specifier === "server-only"
    ? { url: "data:text/javascript,export {}", shortCircuit: true }
    : nextResolve(specifier, context)
} })
const { isTrustedAppRequest } = await import("../lib/auth/app-origin.ts")

test("map mutation origin checks behind a reverse proxy", async t => {
  const original = { ...process.env }
  t.after(() => {
    for (const key of ["APP_URL", "NEXT_PUBLIC_APP_URL", "NODE_ENV"]) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  })
  process.env.NODE_ENV = "production"
  process.env.APP_URL = "https://dashboard.example.com"
  delete process.env.NEXT_PUBLIC_APP_URL
  const request = (origin, extra = {}) => new Request("http://container:3000/api/marketing/map-targets", {
    method: "PUT", headers: { ...(origin === undefined ? {} : { origin }), ...extra },
  })

  await t.test("accepts canonical HTTPS origin despite internal HTTP URL", () => {
    assert.equal(isTrustedAppRequest(request(process.env.APP_URL)), true)
  })
  await t.test("rejects missing, null, malformed, other host, scheme and port origins", () => {
    for (const origin of [undefined, "null", "not a URL", "https://evil.example", "http://dashboard.example.com", "https://dashboard.example.com:444", "https://dashboard.example.com.evil.example", "https://dashboard.example.com/path"]) {
      assert.equal(isTrustedAppRequest(request(origin)), false, String(origin))
    }
  })
  await t.test("ignores spoofed proxy and Host headers", () => {
    assert.equal(isTrustedAppRequest(request("https://evil.example", {
      host: "evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https",
    })), false)
  })
  await t.test("fails closed without trusted production configuration", () => {
    delete process.env.APP_URL
    assert.throws(() => isTrustedAppRequest(request("http://container:3000")), /APP_URL is required/)
  })
  await t.test("supports existing public configuration fallback", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://dashboard.example.com"
    assert.equal(isTrustedAppRequest(request(process.env.NEXT_PUBLIC_APP_URL)), true)
    delete process.env.NEXT_PUBLIC_APP_URL
  })
  await t.test("rejects insecure production configuration", () => {
    process.env.APP_URL = "http://dashboard.example.com"
    assert.throws(() => isTrustedAppRequest(request(process.env.APP_URL)), /HTTPS/)
    delete process.env.APP_URL
  })
  await t.test("allows local same-origin development only", () => {
    process.env.NODE_ENV = "development"
    assert.equal(isTrustedAppRequest(request("http://container:3000")), true)
    assert.equal(isTrustedAppRequest(request("https://evil.example")), false)
  })
})
