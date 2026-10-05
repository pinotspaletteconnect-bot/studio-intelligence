import { describe, expect, it } from "vitest"
import { geoBounds, geoMercator } from "d3-geo"
import { zipViewportGeometry } from "../lib/maps/zip-viewport"

const distant: GeoJSON.Geometry = { type: "Point", coordinates: [-72.45, 41.98] }
describe("ZIP map viewport", () => {
  it("keeps Columbus readable when a Connecticut ZIP enters the ranking", () => {
    const local = zipViewportGeometry(39.98, -83, false, [distant])
    expect(local).toEqual(zipViewportGeometry(39.98, -83, false, []))
    const bounds = geoBounds({ type: "GeometryCollection", geometries: local })
    expect(bounds[1][0] - bounds[0][0]).toBeLessThan(1)
    const projection = geoMercator().fitExtent([[18, 18], [542, 372]], { type: "GeometryCollection", geometries: local })
    const center = projection([-83, 39.98])!
    expect(center[0]).toBeCloseTo(280, 0)
    expect(center[1]).toBeGreaterThan(180)
    expect(projection(distant.coordinates as [number, number])![0]).toBeGreaterThan(560)
  })
  it("includes distant ZIPs on request and preserves the fallback without studio coordinates", () => {
    expect(zipViewportGeometry(39.98, -83, true, [distant])).toEqual([distant])
    expect(zipViewportGeometry(null, null, false, [distant])).toEqual([distant])
  })
})
