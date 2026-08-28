import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"
import { isTrustedAppRequest } from "@/lib/auth/app-origin"
import { targetCirclesSchema, zipTargetsSchema } from "@/lib/maps/target-circles"
import { assertTargetEditor, findTargetAddress, getMapTargets, MapTargetError, saveMapTargets } from "@/lib/services/map-targets"

const studioIdSchema = z.number().int().positive()
const saveSchema = z.object({ studioId: studioIdSchema, circles: targetCirclesSchema, zipTargets: zipTargetsSchema.optional(), revision: z.uuid().nullable() }).strict()
const addressSchema = z.object({ studioId: studioIdSchema, address: z.string().trim().min(8).max(300) }).strict()
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } })
function failure(error: unknown) {
  return apiAccessResponse(error) ?? (error instanceof MapTargetError ? json({ error: error.message }, error.status) : json({ error: "Unable to process map targets. Please retry; unsaved changes are still in this tab." }, 500))
}
function sameOrigin(request: NextRequest) {
  // This endpoint is for the dashboard's same-origin JSON forms only.
  if (!isTrustedAppRequest(request)) throw new MapTargetError(403, "Same-origin request required.")
}
export async function GET(request: NextRequest) {
  try {
    const access = await requireApiAccess()
    const parsed = studioIdSchema.safeParse(Number(request.nextUrl.searchParams.get("studioId")))
    if (!parsed.success) return json({ error: "A studio is required." }, 400)
    return json(await getMapTargets(access, parsed.data))
  } catch (error) { return failure(error) }
}
export async function PUT(request: NextRequest) {
  try {
    sameOrigin(request)
    const access = await requireApiAccess()
    assertTargetEditor(access)
    const parsed = saveSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return json({ error: "Check target ZIP codes (up to 200 unique five-digit codes), colors, and circles (0.1–500 miles; maximum 20 circles)." }, 400)
    return json(await saveMapTargets(access, parsed.data.studioId, parsed.data.circles, parsed.data.revision, parsed.data.zipTargets))
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request)
    const access = await requireApiAccess()
    assertTargetEditor(access)
    const parsed = addressSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return json({ error: "Enter a complete US street address and studio." }, 400)
    assertStudioAccess(access, parsed.data.studioId)
    return json({ matches: await findTargetAddress(parsed.data.address) })
  } catch (error) { return failure(error) }
}
