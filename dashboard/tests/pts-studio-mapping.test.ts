import { beforeEach, expect, it, vi } from "vitest"

import { requireDashboardContext } from "@/lib/auth/session"

const dbState = vi.hoisted(() => ({
  account: { id: 9, secret_reference: "vault-ref" } as { id: number; secret_reference: string } | null,
  duplicateLocation: false,
  existingStudioMapping: false,
  inserts: [] as Array<{ table: string; value: Record<string, unknown> }>,
}))

vi.mock("@/lib/auth/session", () => ({ requireDashboardContext: vi.fn() }))
vi.mock("@/lib/supabase/auth-server", () => ({ createAuthClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({
  supabase: {
    from(table: string) {
      const response = () => ({
        data: table === "studios" ? { id: 5, brand_id: 3, studio_name: "Huntington Beach" }
          : table === "pts_integration_accounts" ? dbState.account
          : table === "studio_integrations" ? dbState.existingStudioMapping ? { id: 11 } : null
          : null,
        error: null,
      })
      const builder = {
        select() { return builder },
        eq() { return builder },
        maybeSingle() { return Promise.resolve(response()) },
        limit() { return Promise.resolve({ data: dbState.duplicateLocation ? [{ id: 12 }] : [], error: null }) },
        insert(value: Record<string, unknown>) {
          dbState.inserts.push({ table, value })
          return Promise.resolve({ error: null })
        },
      }
      return builder
    },
  },
}))

import { mapExistingStudioToPtsAccount } from "@/app/(app)/settings/actions"

function form(studioId = "5") {
  const data = new FormData()
  data.set("studioId", studioId)
  data.set("ptsAccountId", "9")
  data.set("ptsLocationId", "456")
  return data
}

beforeEach(() => {
  dbState.account = { id: 9, secret_reference: "vault-ref" }
  dbState.duplicateLocation = false
  dbState.existingStudioMapping = false
  dbState.inserts.length = 0
  vi.mocked(requireDashboardContext).mockResolvedValue({
    userId: "owner", email: "owner@example.test", fullName: null,
    onboardingComplete: true, legalAccepted: true,
    organizationId: 3, role: "owner", allowedStudioIds: [5],
  })
})

it("rejects a studio outside the owner's portfolio before any database write", async () => {
  const state = await mapExistingStudioToPtsAccount(undefined, form("3"))
  expect(state?.error).toMatch(/Choose your studio/)
  expect(dbState.inserts).toHaveLength(0)
})

it("rejects an account that cannot be found in the owner's organization", async () => {
  dbState.account = null
  const state = await mapExistingStudioToPtsAccount(undefined, form())
  expect(state?.error).toMatch(/unavailable/)
  expect(dbState.inserts).toHaveLength(0)
})

it("rejects a location already mapped to another studio", async () => {
  dbState.duplicateLocation = true
  const state = await mapExistingStudioToPtsAccount(undefined, form())
  expect(state?.error).toMatch(/already mapped/)
  expect(dbState.inserts).toHaveLength(0)
})

it("writes only the owner organization's PTS mapping", async () => {
  const state = await mapExistingStudioToPtsAccount(undefined, form())
  expect(state?.complete).toBe(true)
  expect(dbState.inserts).toEqual([{ table: "studio_integrations", value: expect.objectContaining({
    organization_id: 3, brand_id: 3, studio_id: 5, external_id: "456", integration_type: "pts",
    configuration: expect.objectContaining({ pts_account_id: 9, credential_reference: "vault-ref" }),
  }) }])
})
