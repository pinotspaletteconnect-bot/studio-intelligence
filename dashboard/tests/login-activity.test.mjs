import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { test } from "node:test"

// Exercise the real login action and signed cookie logic, replacing only the
// framework request context and external authentication service.
const contextUrl = `data:text/javascript,${encodeURIComponent(`
  export const state = { result: null, writes: [], signOuts: 0 };
  export async function cookies() { return { set(...args) { state.writes.push(args) } } }
  export function redirect(path) { throw new Error('REDIRECT:' + path) }
  export async function createAuthClient() { return { auth: {
    async signInWithPassword() { return state.result },
    async signOut() { state.signOuts++ }
  } } }
`)}`
registerHooks({ resolve(specifier, context, nextResolve) {
  if (["next/navigation", "next/headers", "@/lib/supabase/auth-server"].includes(specifier)) return { url: contextUrl, shortCircuit: true }
  if (specifier.startsWith("@/")) return { url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true }
  return nextResolve(specifier, context)
} })
const { state } = await import(contextUrl)
const { login } = await import("../app/login/actions.ts")
const { createActivityCookieValue, readActivityTimestamp, SESSION_ACTIVITY_COOKIE, SESSION_IDLE_LIMIT_MS, SESSION_ABSOLUTE_LIMIT_MS } = await import("../lib/auth/session-policy.ts")

test("fresh login resets idle activity only after successful authentication", async t => {
  const original = process.env.SUPABASE_SERVER_SECRET
  process.env.SUPABASE_SERVER_SECRET = "local-test-secret-not-a-real-credential"
  t.after(() => { if (original === undefined) delete process.env.SUPABASE_SERVER_SECRET; else process.env.SUPABASE_SERVER_SECRET = original })
  const form = new FormData()
  form.set("email", "test@example.com"); form.set("password", "test-password")
  const reset = result => { state.result = result; state.writes = []; state.signOuts = 0 }
  await t.test("replaces stale signed activity before dashboard redirect", async () => {
    const stale = await createActivityCookieValue(Date.now() - SESSION_IDLE_LIMIT_MS - 1000)
    assert.ok(Date.now() - await readActivityTimestamp(stale) > SESSION_IDLE_LIMIT_MS)
    reset({ data: { user: { app_metadata: {} } }, error: null })
    const started = Date.now()
    await assert.rejects(login(undefined, form), /REDIRECT:\/dashboard/)
    assert.equal(state.writes.length, 1)
    const [name, value, options] = state.writes[0]
    assert.equal(name, SESSION_ACTIVITY_COOKIE)
    assert.ok(await readActivityTimestamp(value) >= started)
    assert.equal(options.httpOnly, true); assert.equal(options.sameSite, "lax"); assert.equal(options.path, "/")
    assert.equal(SESSION_IDLE_LIMIT_MS, 30 * 60 * 1000)
    assert.equal(SESSION_ABSOLUTE_LIMIT_MS, 12 * 60 * 60 * 1000)
  })
  await t.test("bad credentials and missing users never renew activity", async () => {
    for (const result of [{ data: { user: null }, error: { message: "invalid" } }, { data: { user: null }, error: null }]) {
      reset(result)
      assert.match((await login(undefined, form)).error, /incorrect/)
      assert.equal(state.writes.length, 0)
    }
  })
  await t.test("expired temporary passwords sign out without renewing activity", async () => {
    reset({ data: { user: { app_metadata: { temporary_password_must_change: true, temporary_password_expires_at: new Date(0).toISOString() } } }, error: null })
    assert.match((await login(undefined, form)).error, /expired/)
    assert.equal(state.signOuts, 1); assert.equal(state.writes.length, 0)
  })
  await t.test("valid temporary passwords get a fresh activity timestamp before redirect", async () => {
    reset({ data: { user: { destination: "reset", app_metadata: { temporary_password_must_change: true, temporary_password_expires_at: new Date(Date.now() + 60000).toISOString() } } }, error: null })
    await assert.rejects(login(undefined, form), /REDIRECT:\/reset-password/)
    assert.equal(state.writes.length, 1)
  })
  await t.test("invalid form input never renews activity", async () => {
    reset(null)
    assert.match((await login(undefined, new FormData())).error, /valid email/)
    assert.equal(state.writes.length, 0)
  })
})
