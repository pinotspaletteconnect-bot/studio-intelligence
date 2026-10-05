"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { zipViewportGeometry } from "@/lib/maps/zip-viewport"
import { MapPin, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { circleGeometry, emptyZipTargets, type TargetCircle, type ZipTargets } from "@/lib/maps/target-circles"
import { TargetCircleEditor } from "@/components/studio/operations/target-circle-editor"

type ZipRow = { studioId: number; zipCode: string; orderCount: number; bookedSales: number }
type StudioLocation = { id: number; name: string; city: string; state: string; address: string | null; latitude: number | null; longitude: number | null }
type Properties = { ZCTA5?: string; CENTLAT?: string; CENTLON?: string }
type Feature = GeoJSON.Feature<GeoJSON.Geometry, Properties>
type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Properties>
type Metric = "bookedSales" | "orderCount"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

function starPoints(centerX: number, centerY: number, outerRadius = 9, innerRadius = 4.2) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`
  }).join(" ")
}

function rewindFeature(feature: Feature): Feature {
  const geometry = feature.geometry
  if (geometry.type === "Polygon") return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map(ring => [...ring].reverse()) } }
  if (geometry.type === "MultiPolygon") return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map(polygon => polygon.map(ring => [...ring].reverse())) } }
  return feature
}

function StudioMap({ studio, rows, staticFeatures, staticLoaded, metric, activeZip, setActiveZip }: { studio: StudioLocation; rows: ZipRow[]; staticFeatures: Feature[]; staticLoaded: boolean; metric: Metric; activeZip: string | null; setActiveZip: (zip: string | null) => void }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showAll, setShowAll] = useState(false)
  const drag = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null)
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }
  const [circles, setCircles] = useState<TargetCircle[]>([])
  const [zipTargets, setZipTargets] = useState<ZipTargets>(emptyZipTargets)
  const [remoteFeatures, setRemoteFeatures] = useState<Feature[]>([])
  const [boundaryError, setBoundaryError] = useState(false)
  const features = useMemo(() => [...new Map([...staticFeatures, ...remoteFeatures].map(feature => [feature.properties?.ZCTA5, feature])).values()], [staticFeatures, remoteFeatures])
  const requestedCodes = useMemo(() => {
    const sales = [...rows].sort((a, b) => b.bookedSales - a.bookedSales).slice(0, 10)
    const orders = [...rows].sort((a, b) => b.orderCount - a.orderCount).slice(0, 10)
    const staticCodes = new Set(staticFeatures.map(feature => feature.properties?.ZCTA5))
    return [...new Set([...sales, ...orders].map(row => row.zipCode).concat(zipTargets.codes))]
      .filter(code => !staticCodes.has(code)).sort().join(",")
  }, [rows, staticFeatures, zipTargets.codes])
  useEffect(() => {
    if (!staticLoaded || !requestedCodes) return
    const controller = new AbortController()
    fetch(`/api/marketing/zip-boundaries?${new URLSearchParams({ codes: requestedCodes })}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("ZIP boundaries unavailable")
        return response.json() as Promise<FeatureCollection>
      })
      .then(collection => { setRemoteFeatures(collection.features.map(feature => rewindFeature(feature as Feature))); setBoundaryError(false) })
      .catch(error => { if (error.name !== "AbortError") setBoundaryError(true) })
    return () => controller.abort()
  }, [requestedCodes, staticLoaded])
  const targetFeatures = useMemo(() => features.filter(feature => zipTargets.codes.includes(feature.properties?.ZCTA5 ?? "")), [features, zipTargets.codes])
  const unmappedTargets = useMemo(() => zipTargets.codes.filter(zip => !features.some(feature => feature.properties?.ZCTA5 === zip)), [features, zipTargets.codes])
  const overlays = useMemo(() => circles.filter(circle => circle.visible).map(circle => ({ circle, geometry: circleGeometry(circle) })), [circles])
  useEffect(() => {
    if (!frameRef.current) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(300, Math.floor(entries[0].contentRect.width))))
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [])

  const values = useMemo(() => new Map(rows.map(row => [row.zipCode, row])), [rows])
  const ranked = useMemo(() => [...rows].sort((a, b) => b[metric] - a[metric]), [rows, metric])
  const topTen = useMemo(() => ranked.slice(0, 10), [ranked])
  const highlightedZips = useMemo(() => new Set(topTen.map(row => row.zipCode)), [topTen])
  const max = ranked[0]?.[metric] ?? 0
  const region = useMemo(() => {
    const highlighted = topTen.map(row => features.find(candidate => candidate.properties?.ZCTA5 === row.zipCode)).filter((feature): feature is Feature => Boolean(feature))
    if (!highlighted.length) return targetFeatures
    const latitudes = highlighted.map(feature => Number(feature.properties?.CENTLAT))
    const longitudes = highlighted.map(feature => Number(feature.properties?.CENTLON))
    const minLatitude = Math.min(...latitudes) - .16, maxLatitude = Math.max(...latitudes) + .16
    const minLongitude = Math.min(...longitudes) - .2, maxLongitude = Math.max(...longitudes) + .2
    return features.filter(feature => { const latitude = Number(feature.properties?.CENTLAT), longitude = Number(feature.properties?.CENTLON); return targetFeatures.includes(feature) || (latitude >= minLatitude && latitude <= maxLatitude && longitude >= minLongitude && longitude <= maxLongitude) })
  }, [features, topTen, targetFeatures])
  const height = width < 480 ? 320 : 390
  const projection = useMemo(() => {
    const geometries = zipViewportGeometry(studio.latitude, studio.longitude, showAll,
      [...region.map(feature => feature.geometry), ...overlays.map(overlay => overlay.geometry)])
    if (studio.latitude !== null && studio.longitude !== null) {
      geometries.push(circleGeometry({ latitude: studio.latitude, longitude: studio.longitude, radiusMiles: 1 }))
    }
    return geometries.length ? geoMercator().fitExtent([[18, 18], [width - 18, height - 18]], { type: "GeometryCollection", geometries }) : null
  }, [region, overlays, studio.latitude, studio.longitude, width, height, showAll])
  const path = useMemo(() => projection ? geoPath(projection) : null, [projection])
  const selected = activeZip ? values.get(activeZip) : null
  const fill = (zip: string) => {
    const value = values.get(zip)?.[metric] ?? 0
    if (!value || !max || !highlightedZips.has(zip)) return "var(--muted)"
    const level = Math.min(5, Math.max(1, Math.ceil(value / max * 5)))
    return `var(--map-zip-${level})`
  }
  const marker = projection && studio.latitude !== null && studio.longitude !== null ? projection([studio.longitude, studio.latitude]) : null

  return <Card><CardContent>
    <div className="mb-3"><h3 className="text-lg font-semibold">{studio.name}</h3><p className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{studio.address ?? `${studio.city}, ${studio.state}`}</p></div>
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(180px,2fr)]">
      <div ref={frameRef} className="relative overflow-hidden rounded-lg border bg-muted/20" style={{ minHeight: height }}>
        {path ? <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full cursor-grab touch-none active:cursor-grabbing" tabIndex={0}
          onPointerDown={event => {
            if (event.button !== 0) return
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
          }}
          onPointerMove={event => {
            const start = drag.current
            if (!start || start.id !== event.pointerId) return
            const scale = width / event.currentTarget.getBoundingClientRect().width
            setPan({ x: start.panX + (event.clientX - start.x) * scale, y: start.panY + (event.clientY - start.y) * scale })
          }}
          onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
          onLostPointerCapture={() => { drag.current = null }}
          onKeyDown={event => {
            const directions: Record<string, [number, number]> = { ArrowLeft: [30, 0], ArrowRight: [-30, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] }
            const direction = directions[event.key]
            if (direction) { event.preventDefault(); setPan(current => ({ x: current.x + direction[0], y: current.y + direction[1] })) }
            if (event.key === '+' || event.key === '=') setZoom(current => Math.min(12, current * 1.5))
            if (event.key === '-') setZoom(current => Math.max(.5, current / 1.5))
            if (event.key === 'Home') resetView()
          }} role="img" aria-label={`${studio.name} ZIP areas shaded by ${metric === "bookedSales" ? "booked sales" : "order count"}`}>
          <g transform={`translate(${width / 2 + pan.x} ${height / 2 + pan.y}) scale(${zoom}) translate(${-width / 2} ${-height / 2})`}>
          {region.map(feature => {
            const zip = feature.properties?.ZCTA5 ?? ""
            const value = values.get(zip)
            return <path key={zip} d={path(feature) ?? undefined} fill={fill(zip)} stroke="var(--card)" strokeWidth={activeZip === zip ? 2 : .7} vectorEffect="non-scaling-stroke" className={value ? "cursor-pointer transition-opacity hover:opacity-80" : undefined} onMouseEnter={() => value && setActiveZip(zip)} onMouseLeave={() => setActiveZip(null)} onFocus={() => value && setActiveZip(zip)} onBlur={() => setActiveZip(null)} tabIndex={value ? 0 : undefined}><title>{value ? `${zip}: ${money.format(value.bookedSales)}, ${value.orderCount} orders` : `ZIP ${zip}`}</title></path>
          })}
          {overlays.map(({ circle, geometry }) => <g key={circle.id} pointerEvents="none"><path d={path(geometry) ?? undefined} fill={circle.color} fillOpacity={0.13} stroke={circle.color} strokeWidth={2} vectorEffect="non-scaling-stroke"><title>{circle.name}: {circle.radiusMiles} mile radius</title></path>{(() => {
            const center = projection?.([circle.longitude, circle.latitude])
            return center ? <><circle cx={center[0]} cy={center[1]} r={3 / zoom} fill={circle.color} /><text x={center[0]} y={center[1] - 8} textAnchor="middle" fontSize={11} transform={`translate(${center[0]} ${center[1]}) scale(${1 / zoom}) translate(${-center[0]} ${-center[1]})`} fill={circle.color} stroke="var(--card)" strokeWidth={3} paintOrder="stroke">{circle.name} · {circle.radiusMiles} mi</text></> : null
          })()}</g>)}
          <g data-map-layer="target-zip-outlines" fill="none" pointerEvents="none">
            {targetFeatures.map(feature => <path key={feature.properties?.ZCTA5} d={path(feature) ?? undefined} fill="none" stroke={zipTargets.color} strokeWidth={2.5} vectorEffect="non-scaling-stroke"><title>Target ZIP {feature.properties?.ZCTA5}</title></path>)}
          </g>
          {topTen.map(row => {
            const feature = region.find(candidate => candidate.properties?.ZCTA5 === row.zipCode)
            const center = feature ? path.centroid(feature) : null
            return center && Number.isFinite(center[0]) ? <text key={row.zipCode} x={center[0]} y={center[1]} textAnchor="middle" dominantBaseline="central" fill="var(--foreground)" stroke="var(--card)" strokeWidth="2" paintOrder="stroke" fontSize="12" fontWeight="500" transform={`translate(${center[0]} ${center[1]}) scale(${1 / zoom}) translate(${-center[0]} ${-center[1]})`} pointerEvents="none">{row.zipCode}</text> : null
          })}
          {marker ? <polygon points={starPoints(marker[0], marker[1], 9 / zoom, 4.2 / zoom)} fill="var(--destructive)" stroke="var(--card)" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{studio.name}: {studio.address}</title></polygon> : null}
          </g>
        </svg> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No mapped ZIP data for this period.</div>}
        <div className="absolute right-3 top-3 flex rounded-md border bg-background/95 p-1 shadow-sm" aria-label="Map zoom controls"><button type="button" aria-label="Zoom out" disabled={zoom <= .5} onClick={() => setZoom(current => Math.max(.5, current / 1.5))} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"><ZoomOut className="size-4" /></button><button type="button" aria-label="Reset map view" onClick={resetView} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"><RotateCcw className="size-4" /></button><button type="button" aria-label="Zoom in" disabled={zoom >= 12} onClick={() => setZoom(current => Math.min(12, current * 1.5))} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"><ZoomIn className="size-4" /></button></div>
        {selected ? <div className="absolute bottom-3 left-3 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm"><strong>ZIP {activeZip}</strong><div>{money.format(selected.bookedSales)} · {selected.orderCount.toLocaleString()} orders</div></div> : null}
      </div>
      <div><button type="button" className="mb-2 rounded border px-2 py-1 text-sm" onClick={() => { setShowAll(current => !current); resetView() }}>{showAll ? "Show local area" : "Show all top ZIPs"}</button><h4 className="font-medium">Top 10 ZIP codes</h4><div className="mt-2 space-y-1">{topTen.map((row, index) => <button key={row.zipCode} type="button" onClick={() => {
        const feature = features.find(candidate => candidate.properties?.ZCTA5 === row.zipCode)
        const center = feature && path ? path.centroid(feature) : null
        if (center && center.every(Number.isFinite)) { setZoom(1); setPan({ x: width / 2 - center[0], y: height / 2 - center[1] }); setActiveZip(row.zipCode) }
      }} onMouseEnter={() => setActiveZip(row.zipCode)} onMouseLeave={() => setActiveZip(null)} onFocus={() => setActiveZip(row.zipCode)} onBlur={() => setActiveZip(null)} className="grid w-full grid-cols-[1rem_1.5rem_1fr_auto] items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-muted"><span className="size-3 rounded-sm" style={{ backgroundColor: fill(row.zipCode) }} aria-hidden="true" /><span className="text-muted-foreground">{index + 1}</span><span className="font-medium">{row.zipCode}</span><span>{metric === "bookedSales" ? money.format(row.bookedSales) : row.orderCount.toLocaleString()}</span></button>)}</div></div>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Drag to move. Use the zoom buttons or + / - keys; arrow keys to move. The default view covers 25 miles around the studio. All ZIP sales remain in the ranking. Select a ZIP to center it on the map.</p>
    {!rows.length ? <p className="mt-2 text-xs text-muted-foreground">No captured ZIP sales for this studio and date range. Targeting circles are still available.</p> : null}
    {zipTargets.codes.length ? <p className="mt-2 flex items-center gap-2 text-xs"><span className="inline-block h-3 w-5 border-2" style={{ borderColor: zipTargets.color }} aria-hidden="true" />Target ZIP outlines: {targetFeatures.length} of {zipTargets.codes.length} mapped · no target fill</p> : null}
    {unmappedTargets.length && !boundaryError ? <p role="status" className="mt-2 text-xs text-muted-foreground">No 2020 Census ZIP boundary currently available for: {unmappedTargets.join(", ")}. These targets remain saved.</p> : null}
    {boundaryError ? <p role="status" className="mt-2 text-xs text-muted-foreground">ZIP boundaries could not be loaded right now. ZIP sales in the table remain available.</p> : null}
    <TargetCircleEditor studioId={studio.id} latitude={studio.latitude} longitude={studio.longitude} circles={circles} onChange={setCircles} zipTargets={zipTargets} onZipChange={setZipTargets} />
  </CardContent></Card>
}

export function ZipCodeMap({ rows, studios }: { rows: ZipRow[]; studios: StudioLocation[] }) {
  const [features, setFeatures] = useState<Feature[]>([])
  const [staticLoaded, setStaticLoaded] = useState(false)
  const [metric, setMetric] = useState<Metric>("bookedSales")
  const [activeZip, setActiveZip] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(["/maps/zcta-east.geojson", "/maps/zcta-arizona.geojson"].map(url => fetch(url, { signal: controller.signal }).then(response => response.json() as Promise<FeatureCollection>)))
      .then(collections => setFeatures(collections.flatMap(collection => collection.features.map(feature => rewindFeature(feature as Feature)))))
      .catch(error => { if (error.name !== "AbortError") console.error("Unable to load ZIP boundaries", error) })
      .finally(() => { if (!controller.signal.aborted) setStaticLoaded(true) })
    return () => controller.abort()
  }, [])
  const studiosWithData = studios

  return <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Customer ZIP highlights</h2><p className="text-sm text-muted-foreground">One local customer-origin map per studio for the selected dates.</p></div><div className="flex rounded-md border p-1 text-sm" aria-label="Map metric"><button type="button" onClick={() => setMetric("bookedSales")} className={`rounded px-3 py-1.5 ${metric === "bookedSales" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Booked sales</button><button type="button" onClick={() => setMetric("orderCount")} className={`rounded px-3 py-1.5 ${metric === "orderCount" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Orders</button></div></div>
    <div className="grid items-start gap-4 xl:grid-cols-2">{studiosWithData.map(studio => <StudioMap key={studio.id} studio={studio} rows={rows.filter(row => row.studioId === studio.id)} staticFeatures={features} staticLoaded={staticLoaded} metric={metric} activeZip={activeZip} setActiveZip={setActiveZip} />)}</div>
    <p className="text-xs text-muted-foreground">Boundaries are 2020 Census ZCTAs, which approximate USPS ZIP service areas.</p>
  </section>
}
