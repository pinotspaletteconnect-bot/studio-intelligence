import "server-only"

const censusLayer = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query"
const zipPattern = /^\d{5}$/
const maxCodes = 220
const batchSize = 40

type ZipProperties = { ZCTA5: string; CENTLAT?: string; CENTLON?: string }
type ZipFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, ZipProperties>

export function parseZipCodes(value: string | null): string[] | null {
  if (!value) return null
  const codes = [...new Set(value.split(","))]
  if (codes.length > maxCodes || codes.some(code => !zipPattern.test(code))) return null
  return codes.sort()
}

function validFeature(value: unknown, codes: Set<string>): value is ZipFeature {
  if (!value || typeof value !== "object") return false
  const feature = value as Partial<ZipFeature>
  return feature.type === "Feature"
    && !!feature.properties && codes.has(feature.properties.ZCTA5 ?? "")
    && !!feature.geometry && ["Polygon", "MultiPolygon"].includes(feature.geometry.type)
    && Array.isArray(feature.geometry.coordinates)
}

export async function getCensusZipBoundaries(codes: string[]): Promise<GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, ZipProperties>> {
  const features: ZipFeature[] = []
  for (let index = 0; index < codes.length; index += batchSize) {
    const batch = codes.slice(index, index + batchSize)
    const params = new URLSearchParams({
      where: `ZCTA5 IN (${batch.map(code => `'${code}'`).join(",")})`,
      outFields: "ZCTA5,CENTLAT,CENTLON",
      returnGeometry: "true",
      outSR: "4326",
      geometryPrecision: "4",
      maxAllowableOffset: "0.002",
      f: "geojson",
    })
    const response = await fetch(`${censusLayer}?${params}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error(`Census ZIP boundary request failed (${response.status})`)
    const collection: unknown = await response.json()
    if (!collection || typeof collection !== "object" || (collection as GeoJSON.FeatureCollection).type !== "FeatureCollection"
      || !Array.isArray((collection as GeoJSON.FeatureCollection).features)) {
      throw new Error("Census ZIP boundary response is invalid")
    }
    const requested = new Set(batch)
    for (const feature of (collection as GeoJSON.FeatureCollection).features) {
      if (validFeature(feature, requested)) features.push(feature)
    }
  }
  return { type: "FeatureCollection", features }
}
