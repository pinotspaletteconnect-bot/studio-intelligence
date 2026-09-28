import { afterEach, describe, expect, it, vi } from "vitest"
import { getCensusZipBoundaries, parseZipCodes } from "@/lib/maps/census-zip-boundaries"

afterEach(() => vi.unstubAllGlobals())

describe("ZIP boundaries for newly onboarded studios", () => {
  it("accepts unique five-digit ZIPs and rejects malformed requests", () => {
    expect(parseZipCodes("92647,90620,92647")).toEqual(["90620", "92647"])
    expect(parseZipCodes("92647,not-a-zip")).toBeNull()
    expect(parseZipCodes(Array.from({ length: 221 }, (_, i) => String(i).padStart(5, "0")).join(","))).toBeNull()
  })

  it("requests only ZIP geometry from the Census and ignores unrelated features", async () => {
    const fetchMock = vi.fn(async (url: string) => { void url; return new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { ZCTA5: "92647", CENTLAT: "+33.72", CENTLON: "-118.01" }, geometry: { type: "Polygon", coordinates: [[[-118, 33], [-117, 33], [-117, 34], [-118, 33]]] } },
        { type: "Feature", properties: { ZCTA5: "99999" }, geometry: { type: "Polygon", coordinates: [] } },
      ],
    }), { status: 200 }) })
    vi.stubGlobal("fetch", fetchMock)

    const result = await getCensusZipBoundaries(["92647"])
    expect(result.features).toHaveLength(1)
    expect(result.features[0].properties.ZCTA5).toBe("92647")
    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.hostname).toBe("tigerweb.geo.census.gov")
    expect(url.searchParams.get("where")).toBe("ZCTA5 IN ('92647')")
    expect(url.searchParams.get("f")).toBe("geojson")
  })
})
