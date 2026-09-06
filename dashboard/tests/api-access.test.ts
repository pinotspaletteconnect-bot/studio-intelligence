import { beforeEach, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { getUserAccessContext, type UserAccessContext } from "@/lib/auth/session"
import { warehouse } from "./warehouse"

const state = vi.hoisted(() => ({ client: null as unknown }))
vi.mock("@/lib/supabase/server", () => ({ get supabase() { return state.client } }))
vi.mock("@/lib/auth/session", () => ({ getUserAccessContext: vi.fn() }))

const routes = ["marketing/summary", "operations/summary", "operations/daily-detail", "operations/candle-detail", "operations/art-supplies-detail", "operations/private-party-detail", "operations/mobile-events-detail", "operations/upcoming-classes"]
const context: UserAccessContext = { userId: "user-a", email: "a@example.test", fullName: null, onboardingComplete: true, legalAccepted: true, organizationId: 1, role: "viewer", allowedStudioIds: [1] }
beforeEach(() => { state.client = warehouse({}).client })

it.each(routes)("protects /api/%s before querying warehouse data", async (route) => {
  const handler = await import(/* @vite-ignore */ `../app/api/${route}/route.ts`)
  const request = new NextRequest(`https://dashboard.test/api/${route}?studioId=2&date=2026-08-01&startDate=2026-08-01&endDate=2026-08-02`)
  vi.mocked(getUserAccessContext).mockResolvedValue(null)
  expect((await handler.GET(request)).status).toBe(401)
  vi.mocked(getUserAccessContext).mockResolvedValue(context)
  expect((await handler.GET(request)).status).toBe(403)
})

it("returns only assigned studios for an existing studio-level member", async () => {
  const db = warehouse({ studios: [{ id: 1, studio_name: "Allowed", active: true }, { id: 2, studio_name: "Other organization", active: true }] })
  state.client = db.client
  vi.mocked(getUserAccessContext).mockResolvedValue(context)
  const { GET } = await import("../app/api/studios/route")
  const response = await GET()
  expect(response.status).toBe(200)
  expect((await response.json()).map((studio: { id: number }) => studio.id)).toEqual([1])
})
