"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type ZipRow = { studioId: number; zipCode: string; orderCount: number; bookedSales: number }
type StudioLocation = { id: number; name: string; city: string; state: string; address: string | null; latitude: number | null; longitude: number | null }
type Feature = GeoJSON.Feature<GeoJSON.Geometry, { ZCTA5?: string; CENTLAT?: string; CENTLON?: string }>
type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Feature["properties"]>
type Metric = "bookedSales" | "orderCount"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export function ZipCodeMap({ rows, studios }: { rows: ZipRow[]; studios: StudioLocation[] }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [features, setFeatures] = useState<Feature[]>([])
  const [width, setWidth] = useState(800)
  const [metric, setMetric] = useState<Metric>("bookedSales")
  const [activeZip, setActiveZip] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(["/maps/zcta-east.geojson", "/maps/zcta-arizona.geojson"].map(url => fetch(url, { signal: controller.signal }).then(response => response.json() as Promise<FeatureCollection>)))
      .then(collections => setFeatures(collections.flatMap(collection => collection.features as Feature[])))
      .catch(error => { if (error.name !== "AbortError") console.error("Unable to load ZIP boundaries", error) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!frameRef.current) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(320, Math.floor(entries[0].contentRect.width))))
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [])

  const aggregated = useMemo(() => {
    const values = new Map<string, ZipRow>()
    for (const row of rows) {
      const current = values.get(row.zipCode) ?? { ...row, studioId: 0, orderCount: 0, bookedSales: 0 }
      current.orderCount += row.orderCount; current.bookedSales += row.bookedSales; values.set(row.zipCode, current)
    }
    return values
  }, [rows])

  const visibleFeatures = useMemo(() => {
    if (!features.length) return []
    const located = studios.filter(studio => studio.latitude !== null && studio.longitude !== null)
    if (!located.length || located.length > 1) return features
    const studio = located[0]
    return features.filter(feature => Math.abs(Number(feature.properties?.CENTLAT) - studio.latitude!) < 1.35 && Math.abs(Number(feature.properties?.CENTLON) - studio.longitude!) < 1.75)
  }, [features, studios])

  const height = width < 640 ? 390 : 520
  const mapWidth = width < 850 ? width : Math.floor(width * 0.7)
  const projection = useMemo(() => visibleFeatures.length ? geoMercator().fitExtent([[12, 12], [mapWidth - 12, height - 12]], { type: "FeatureCollection", features: visibleFeatures } as FeatureCollection) : null, [visibleFeatures, mapWidth, height])
  const path = useMemo(() => projection ? geoPath(projection) : null, [projection])
  const ranked = useMemo(() => [...aggregated.values()].sort((a, b) => b[metric] - a[metric]), [aggregated, metric])
  const max = ranked[0]?.[metric] ?? 0
  const selected = activeZip ? aggregated.get(activeZip) : null
  const fill = (zip: string) => {
    const value = aggregated.get(zip)?.[metric] ?? 0
    if (!value || !max) return "var(--muted)"
    const level = Math.min(5, Math.max(1, Math.ceil(value / max * 5)))
    return `var(--chart-${6 - level})`
  }

  return <Card><CardContent>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Customer ZIP highlights</h2><p className="text-sm text-muted-foreground">Billing ZIP areas ranked across the selected studios and dates.</p></div>
      <div className="flex rounded-md border p-1 text-sm" aria-label="Map metric">
        <button type="button" onClick={() => setMetric("bookedSales")} className={`rounded px-3 py-1.5 ${metric === "bookedSales" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Booked sales</button>
        <button type="button" onClick={() => setMetric("orderCount")} className={`rounded px-3 py-1.5 ${metric === "orderCount" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Orders</button>
      </div>
    </div>
    <div ref={frameRef} className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(240px,3fr)]">
      <div className="relative overflow-hidden rounded-lg border bg-muted/20" style={{ minHeight: height }}>
        {path ? <svg viewBox={`0 0 ${mapWidth} ${height}`} className="h-full w-full" role="img" aria-label={`ZIP areas shaded by ${metric === "bookedSales" ? "booked sales" : "order count"}`}>
          {visibleFeatures.map(feature => {
            const zip = feature.properties?.ZCTA5 ?? ""
            const value = aggregated.get(zip)
            return <path key={zip} d={path(feature) ?? undefined} fill={fill(zip)} stroke="var(--card)" strokeWidth={activeZip === zip ? 2 : .55} className={value ? "cursor-pointer transition-opacity hover:opacity-80" : undefined} onMouseEnter={() => value && setActiveZip(zip)} onMouseLeave={() => setActiveZip(null)} onFocus={() => value && setActiveZip(zip)} onBlur={() => setActiveZip(null)} tabIndex={value ? 0 : undefined}><title>{value ? `${zip}: ${money.format(value.bookedSales)}, ${value.orderCount} orders` : `ZIP ${zip}`}</title></path>
          })}
          {studios.map(studio => studio.latitude !== null && studio.longitude !== null && projection ? (() => { const point = projection([studio.longitude, studio.latitude]); return point ? <g key={studio.id} transform={`translate(${point[0]} ${point[1]})`}><circle r="6" fill="var(--destructive)" stroke="var(--card)" strokeWidth="2"><title>{studio.name}: {studio.address ?? `${studio.city}, ${studio.state}`}</title></circle></g> : null })() : null)}
        </svg> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading Census ZIP boundaries…</div>}
        {selected ? <div className="absolute bottom-3 left-3 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm"><strong>ZIP {activeZip}</strong><div>{money.format(selected.bookedSales)} · {selected.orderCount.toLocaleString()} orders</div></div> : null}
      </div>
      <div className="space-y-4">
        <div><h3 className="font-medium">Top ZIP codes</h3><div className="mt-2 space-y-1">{ranked.slice(0, 10).map((row, index) => <button key={row.zipCode} type="button" onMouseEnter={() => setActiveZip(row.zipCode)} onMouseLeave={() => setActiveZip(null)} onFocus={() => setActiveZip(row.zipCode)} onBlur={() => setActiveZip(null)} className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-muted"><span className="text-muted-foreground">{index + 1}</span><span className="font-medium">{row.zipCode}</span><span>{metric === "bookedSales" ? money.format(row.bookedSales) : row.orderCount.toLocaleString()}</span></button>)}</div></div>
        <div className="border-t pt-3"><h3 className="mb-2 font-medium">Studio locations</h3>{studios.map(studio => <div key={studio.id} className="mb-3 flex gap-2 text-sm last:mb-0"><MapPin className="mt-0.5 size-4 shrink-0 text-destructive"/><div><p className="font-medium">{studio.name}</p><p className="text-muted-foreground">{studio.address ?? `${studio.city}, ${studio.state}`}</p></div></div>)}</div>
        <p className="text-xs text-muted-foreground">Boundaries are 2020 Census ZCTAs, which approximate USPS ZIP service areas.</p>
      </div>
    </div>
  </CardContent></Card>
}
