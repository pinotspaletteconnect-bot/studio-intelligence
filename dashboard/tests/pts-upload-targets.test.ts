import { beforeEach, expect, it, vi } from "vitest"
import { warehouse, type Row } from "./warehouse"
const state = vi.hoisted(() => ({ client: null as unknown }))
vi.mock("@/lib/supabase/server", () => ({ get supabase() { return state.client } }))
import { resolvePtsUploadTarget } from "@/lib/services/pts-upload-targets"
import { getPtsBackfillTarget } from "@/lib/services/pts-backfills"

const studio = { id: 5, organization_id: 3, brand_id: 3, studio_code: "HB", studio_name: "Huntington Beach", timezone: "America/Los_Angeles", active: true }
const mapping = { studio_id: 5, organization_id: 3, brand_id: 3, integration_type: "pts", external_id: "194", is_active: true }
function setRows(studios: Row[] = [studio], mappings: Row[] = [mapping]) {
  const db = warehouse({ studios, studio_integrations: mappings })
  state.client = db.client
  return db
}
beforeEach(() => { setRows() })
it("resolves an active newly onboarded studio and its local timezone", async () => {
  expect(await resolvePtsUploadTarget("194")).toEqual({ organizationId: 3, brandId: 3, studioId: 5, code: "HB", locationId: "194", locationName: "Huntington Beach", timeZone: "America/Los_Angeles" })
})
it("does not allow the public gateway to resolve a different organization's studio", async () => {
  expect(await getPtsBackfillTarget(1, 5)).toBeNull()
  expect(await getPtsBackfillTarget(3, 5)).toEqual({ studioCode: "3:5:194" })
})
it("rejects unknown, inactive, or cross-tenant mappings", async () => {
  expect(await resolvePtsUploadTarget("999")).toBeNull()
  for (const changed of [{ ...mapping, is_active: false }, { ...mapping, organization_id: 4 }, { ...mapping, brand_id: 4 }]) {
    setRows([studio], [changed])
    expect(await resolvePtsUploadTarget("194")).toBeNull()
  }
})
it("rejects ambiguous source locations instead of choosing a tenant", async () => {
  setRows([studio], [mapping, { ...mapping, studio_id: 9, organization_id: 4 }])
  expect(await resolvePtsUploadTarget("194")).toBeNull()
  expect(await resolvePtsUploadTarget("194", 3, 5)).toMatchObject({ studioId: 5, organizationId: 3 })
})
it("rejects inactive studios and missing or invalid timezones", async () => {
  for (const changed of [{ ...studio, active: false }, { ...studio, timezone: null }, { ...studio, timezone: "invalid" }]) {
    setRows([changed])
    expect(await resolvePtsUploadTarget("194")).toBeNull()
  }
})
it("surfaces warehouse failures without returning a default studio", async () => {
  const db = setRows()
  db.failures.set("studio_integrations", { code: "ERROR", message: "test failure" })
  await expect(resolvePtsUploadTarget("194")).rejects.toMatchObject({ code: "ERROR" })
})
