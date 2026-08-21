"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type ZipRow = { studioId: number; zipCode: string; orderCount: number; bookedSales: number }
type StudioLocation = { id: number; name: string; city: string; state: string; address: string | null; latitude: number | null; longitude: number | null }
type Properties = { ZCTA5?: string; CENTLAT?: string; CENTLON?: string }
type Feature = GeoJSON.Feature<GeoJSON.Geometry, Properties>
type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Properties>
type Metric = "bookedSales" | "orderCount"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

function rewindFeature(feature: Feature): Feature {
  const geometry = feature.geometry
  if (geometry.type === "Polygon") return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map(ring => [...ring].reverse()) } }
  if (geometry.type === "MultiPolygon") return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map(polygon => polygon.map(ring => [...ring].reverse())) } }
  return feature
}

function StudioMap({ studio, rows, features, metric, activeZip, setActiveZip }: { studio: StudioLocation; rows: ZipRow[]; features: Feature[]; metric: Metric; activeZip: string | null; setActiveZip: (zip: string | null) => void }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)
  useEffect(() => {
    if (!frameRef.current) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(300, Math.floor(entries[0].contentRect.width))))
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [])

  const values = useMemo(() => new Map(rows.map(row => [row.zipCode, row])), [rows])
  const ranked = useMemo(() => [...rows].sort((a, b) => b[metric] - a[metric]), [rows, metric])
  const max = ranked[0]?.[metric] ?? 0
  const anchor = useMemo(() => {
    const feature = ranked.map(row => features.find(candidate => candidate.properties?.ZCTA5 === row.zipCode)).find(Boolean)
    return feature ? { latitude: Number(feature.properties?.CENTLAT), longitude: Number(feature.properties?.CENTLON) } : null
  }, [features, ranked])
  const region = useMemo(() => {
    if (!anchor) return []
    return features.filter(feature => Math.abs(Number(feature.properties?.CENTLAT) - anchor.latitude) < .72 && Math.abs(Number(feature.properties?.CENTLON) - anchor.longitude) < .92)
  }, [anchor, features])
  const height = width < 480 ? 320 : 390
  const projection = useMemo(() => region.length ? geoMercator().fitExtent([[10, 10], [width - 10, height - 10]], { type: "FeatureCollection", features: region } as FeatureCollection) : null, [region, width, height])
  const path = useMemo(() => projection ? geoPath(projection) : null, [projection])
  const selected = activeZip ? values.get(activeZip) : null
  const fill = (zip: string) => {
    const value = values.get(zip)?.[metric] ?? 0
    if (!value || !max) return "var(--muted)"
    const level = Math.min(5, Math.max(1, Math.ceil(value / max * 5)))
    return `var(--chart-${6 - level})`
  }
  const marker = projection && studio.latitude !== null && studio.longitude !== null ? projection([studio.longitude, studio.latitude]) : null

  return <Card><CardContent>
    <div className="mb-3"><h3 className="text-lg font-semibold">{studio.name}</h3><p className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{studio.address ?? `${studio.city}, ${studio.state}`}</p></div>
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(180px,2fr)]">
      <div ref={frameRef} className="relative overflow-hidden rounded-lg border bg-muted/20" style={{ minHeight: height }}>
        {path ? <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${studio.name} ZIP areas shaded by ${metric === "bookedSales" ? "booked sales" : "order count"}`}>
          {region.map(feature => {
            const zip = feature.properties?.ZCTA5 ?? ""
            const value = values.get(zip)
            return <path key={zip} d={path(feature) ?? undefined} fill={fill(zip)} stroke="var(--card)" strokeWidth={activeZip === zip ? 2 : .7} className={value ? "cursor-pointer transition-opacity hover:opacity-80" : undefined} onMouseEnter={() => value && setActiveZip(zip)} onMouseLeave={() => setActiveZip(null)} onFocus={() => value && setActiveZip(zip)} onBlur={() => setActiveZip(null)} tabIndex={value ? 0 : undefined}><title>{value ? `${zip}: ${money.format(value.bookedSales)}, ${value.orderCount} orders` : `ZIP ${zip}`}</title></path>
          })}
          {marker ? <circle cx={marker[0]} cy={marker[1]} r="6" fill="var(--destructive)" stroke="var(--card)" strokeWidth="2"><title>{studio.name}: {studio.address}</title></circle> : null}
        </svg> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No mapped ZIP data for this period.</div>}
        {selected ? <div className="absolute bottom-3 left-3 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm"><strong>ZIP {activeZip}</strong><div>{money.format(selected.bookedSales)} · {selected.orderCount.toLocaleString()} orders</div></div> : null}
      </div>
      <div><h4 className="font-medium">Top ZIP codes</h4><div className="mt-2 space-y-1">{ranked.slice(0, 8).map((row, index) => <button key={row.zipCode} type="button" onMouseEnter={() => setActiveZip(row.zipCode)} onMouseLeave={() => setActiveZip(null)} onFocus={() => setActiveZip(row.zipCode)} onBlur={() => setActiveZip(null)} className="grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-muted"><span className="text-muted-foreground">{index + 1}</span><span className="font-medium">{row.zipCode}</span><span>{metric === "bookedSales" ? money.format(row.bookedSales) : row.orderCount.toLocaleString()}</span></button>)}</div></div>
    </div>
  </CardContent></Card>
}

export function ZipCodeMap({ rows, studios }: { rows: ZipRow[]; studios: StudioLocation[] }) {
  const [features, setFeatures] = useState<Feature[]>([])
  const [metric, setMetric] = useState<Metric>("bookedSales")
  const [activeZip, setActiveZip] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(["/maps/zcta-east.geojson", "/maps/zcta-arizona.geojson"].map(url => fetch(url, { signal: controller.signal }).then(response => response.json() as Promise<FeatureCollection>)))
      .then(collections => setFeatures(collections.flatMap(collection => collection.features.map(feature => rewindFeature(feature as Feature)))))
      .catch(error => { if (error.name !== "AbortError") console.error("Unable to load ZIP boundaries", error) })
    return () => controller.abort()
  }, [])
  const studiosWithData = studios.filter(studio => rows.some(row => row.studioId === studio.id))

  return <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Customer ZIP highlights</h2><p className="text-sm text-muted-foreground">One local customer-origin map per studio for the selected dates.</p></div><div className="flex rounded-md border p-1 text-sm" aria-label="Map metric"><button type="button" onClick={() => setMetric("bookedSales")} className={`rounded px-3 py-1.5 ${metric === "bookedSales" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Booked sales</button><button type="button" onClick={() => setMetric("orderCount")} className={`rounded px-3 py-1.5 ${metric === "orderCount" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Orders</button></div></div>
    <div className="grid items-start gap-4 xl:grid-cols-2">{studiosWithData.map(studio => <StudioMap key={studio.id} studio={studio} rows={rows.filter(row => row.studioId === studio.id)} features={features} metric={metric} activeZip={activeZip} setActiveZip={setActiveZip} />)}</div>
    <p className="text-xs text-muted-foreground">Boundaries are 2020 Census ZCTAs, which approximate USPS ZIP service areas.</p>
  </section>
}
