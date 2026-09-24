import { afterEach, beforeEach, expect, it, vi } from "vitest"
const state = vi.hoisted(() => ({ resolve: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock("@/lib/services/pts-upload-targets", () => ({ resolvePtsUploadTarget: state.resolve }))
vi.mock("@/lib/supabase/server", () => ({ supabase: { rpc: state.rpc, from: state.from } }))
import { POST } from "@/app/api/internal/pts-account/route"
const target = { organizationId: 3, brandId: 3, studioId: 5, code: "HB", locationId: "194", locationName: "Huntington Beach", timeZone: "America/Los_Angeles" }
function request(body: unknown, token = "test-only") {
  return new Request("https://dashboard.invalid/api/internal/pts-account", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) })
}
beforeEach(() => {
  vi.stubEnv("PTS_SECRET_BROKER_TOKEN", "test-only")
  state.resolve.mockResolvedValue(target)
})
afterEach(() => vi.unstubAllEnvs())
it("requires service authentication before looking up a studio", async () => {
  const result = await POST(request({ purpose: "backfill", studioCode: "194" }, "wrong"))
  expect(result.status).toBe(401)
  expect(state.resolve).not.toHaveBeenCalled()
})
it("returns metadata without reading or returning any PTS credentials", async () => {
  const result = await POST(request({ purpose: "backfill", studioCode: "194", organizationId: 3, studioId: 5 }))
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ studio: target })
  expect(result.headers.get("cache-control")).toContain("no-store")
  expect(state.rpc).not.toHaveBeenCalled()
  expect(state.resolve).toHaveBeenCalledWith("194", 3, 5)
})
it("requires tenant and studio to be supplied together", async () => {
  expect((await POST(request({ purpose: "backfill", studioCode: "194", organizationId: 3 }))).status).toBe(400)
})
it("rejects requests that combine a metadata purpose with a credential request", async () => {
  const result = await POST(request({ purpose: "backfill", studioCode: "194", accountId: 2 }))
  expect(result.status).toBe(400)
  expect(state.rpc).not.toHaveBeenCalled()
})
it("fails closed on unknown or ambiguous source mappings", async () => {
  state.resolve.mockResolvedValue(null)
  expect((await POST(request({ purpose: "backfill", studioCode: "194" }))).status).toBe(409)
})
it("preserves the existing account credential request", async () => {
  state.rpc.mockResolvedValue({ data: { username: "fixture", password: "fixture" }, error: null })
  state.from.mockReturnValue({ select: () => ({ eq: () => Promise.resolve({ data: [{ studio_id: 5, studio_code: "HB", pts_location_id: "194", studio_name: "Huntington Beach", timezone: "America/Los_Angeles", brand_id: 3, reports: [] }], error: null }) }) })
  const result = await POST(request({ accountId: 2 }))
  expect(result.status).toBe(200)
  expect(state.rpc).toHaveBeenCalledWith("get_pts_account_secret", { p_account_id: 2 })
  expect(state.resolve).not.toHaveBeenCalled()
})
