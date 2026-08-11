import { NextResponse } from "next/server"
import { z } from "zod"

import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"
import { getPtsBackfillTarget } from "@/lib/services/pts-backfills"

const requestSchema = z.object({
  kind: z.enum(["product_sales", "class_sales"]),
  studioId: z.coerce.number().int().positive(),
})
const allowedExtensions = [".xlsx", ".xls"]
const maxUploadBytes = 25 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const access = await requireApiAccess()
    if (!["owner", "administrator"].includes(access.role)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 })
    const formData = await request.formData()
    const parsed = requestSchema.safeParse({ kind: formData.get("kind"), studioId: formData.get("studioId") })
    const file = formData.get("file")
    if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: "Choose a studio and PTS Excel workbook." }, { status: 400 })
    assertStudioAccess(access, parsed.data.studioId)
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!allowedExtensions.includes(extension)) return NextResponse.json({ error: "Upload an .xlsx or .xls workbook." }, { status: 400 })
    if (file.size === 0 || file.size > maxUploadBytes) return NextResponse.json({ error: "The workbook must be between 1 byte and 25 MB." }, { status: 400 })

    const target = await getPtsBackfillTarget(access.organizationId, parsed.data.studioId)
    if (!target) return NextResponse.json({ error: "That studio does not have an active PTS mapping." }, { status: 409 })
    const webhookUrl = parsed.data.kind === "product_sales"
      ? process.env.PTS_PRODUCT_SALES_BACKFILL_WEBHOOK_URL
      : process.env.PTS_CLASS_SALES_BACKFILL_WEBHOOK_URL
    const webhookSecret = process.env.PTS_BACKFILL_WEBHOOK_SECRET
    if (!webhookUrl || !webhookSecret) return NextResponse.json({ error: "Backfill processing is temporarily unavailable." }, { status: 503 })

    const payload = new FormData()
    payload.set("kind", parsed.data.kind)
    payload.set("studioCode", target.studioCode)
    const fileField = parsed.data.kind === "product_sales" ? "productSalesFile" : "classSalesFile"
    payload.set(fileField, file, file.name)
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${webhookSecret}` },
      body: payload,
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    })
    const result = await response.json().catch(() => null) as { rowCount?: number } | unknown[] | null
    if (!response.ok) {
      console.error("PTS backfill processor rejected an upload", { status: response.status, kind: parsed.data.kind, studioId: parsed.data.studioId })
      return NextResponse.json({ error: "The workbook could not be imported. Confirm the report type and try again." }, { status: 422 })
    }
    const rowCount = Array.isArray(result) ? result.length : Number(result?.rowCount ?? 0)
    return NextResponse.json({ success: true, rowCount })
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error("PTS backfill upload failed", error)
    return NextResponse.json({ error: "The upload could not be completed. Please try again." }, { status: 500 })
  }
}
