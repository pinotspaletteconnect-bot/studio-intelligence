import { geoCircle } from "d3-geo"
import { z } from "zod"

export const targetCircleSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  latitude: z.number().finite().min(-85).max(85),
  longitude: z.number().finite().min(-180).max(180),
  radiusMiles: z.number().finite().min(0.1).max(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  visible: z.boolean(),
  address: z.string().trim().max(300).nullable(),
}).strict()

export const targetCirclesSchema = z.array(targetCircleSchema).max(20).refine(
  circles => new Set(circles.map(circle => circle.id)).size === circles.length,
  "Circle IDs must be unique."
)
export type TargetCircle = z.infer<typeof targetCircleSchema>
export const zipTargetsSchema = z.object({
  codes: z.array(z.string().regex(/^\d{5}$/)).max(200).refine(codes => new Set(codes).size === codes.length, "ZIP codes must be unique."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
}).strict()
export type ZipTargets = z.infer<typeof zipTargetsSchema>
export const emptyZipTargets: ZipTargets = { codes: [], color: "#d946ef" }
export type TargetSettings = { circles: TargetCircle[]; zipTargets: ZipTargets; revision: string | null }

export function parseTargetZipCodes(text: string): string[] {
  const codes = [...new Set(text.trim().split(/[\s,;]+/).filter(Boolean))]
  if (!zipTargetsSchema.shape.codes.safeParse(codes).success) {
    throw new Error("Enter up to 200 five-digit ZIP codes, separated by commas, spaces or new lines. Keep leading zeros; ZIP+4 is not supported.")
  }
  return codes
}

// Older open tabs send circles only. Preserve their studio's existing ZIP targets.
export function resolveZipTargets(current: ZipTargets, incoming?: ZipTargets): ZipTargets {
  return incoming ?? current
}

// d3-geo expects an angular radius, not pixels or meters. WGS84 mean Earth radius.
export function circleGeometry(circle: Pick<TargetCircle, "latitude" | "longitude" | "radiusMiles">) {
  return geoCircle().center([circle.longitude, circle.latitude])
    .radius(circle.radiusMiles * 1609.344 / 6371008.8 * 180 / Math.PI).precision(2)()
}

export function readTargetSettings(configuration: Record<string, unknown>): TargetSettings {
  const value = configuration.map_targets
  if (value === undefined) return { circles: [], zipTargets: { ...emptyZipTargets, codes: [] }, revision: null }
  const parsed = z.object({ circles: targetCirclesSchema, zipTargets: zipTargetsSchema.optional(), revision: z.uuid() }).safeParse(value)
  if (!parsed.success) throw new Error("Saved targeting circles are invalid; they have not been overwritten.")
  return { ...parsed.data, zipTargets: parsed.data.zipTargets ?? { ...emptyZipTargets, codes: [] } }
}
