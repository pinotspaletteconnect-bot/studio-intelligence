"use client"

import { useEffect, useId, useState } from "react"
import { targetCircleSchema, type TargetCircle, type TargetSettings } from "@/lib/maps/target-circles"

type Center = { address: string; latitude: number; longitude: number }
type Settings = TargetSettings & { canEdit: boolean }
type Props = { studioId: number; latitude: number | null; longitude: number | null; circles: TargetCircle[]; onChange: (circles: TargetCircle[]) => void }
const inputClass = "w-full rounded border bg-background px-2 py-1.5 text-sm"
const buttonClass = "rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"

export function TargetCircleEditor({ studioId, latitude, longitude, circles, onChange }: Props) {
  const prefix = useId()
  const [saved, setSaved] = useState<Settings | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [mode, setMode] = useState("coordinates")
  const [name, setName] = useState("")
  const [lat, setLat] = useState(latitude === null ? "" : String(latitude))
  const [lon, setLon] = useState(longitude === null ? "" : String(longitude))
  const [radius, setRadius] = useState("5")
  const [color, setColor] = useState("#dc2626")
  const [address, setAddress] = useState("")
  const [matches, setMatches] = useState<Center[]>([])
  const [selected, setSelected] = useState<Center | null>(null)
  const dirty = saved !== null && JSON.stringify(saved.circles) !== JSON.stringify(circles)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/marketing/map-targets?studioId=${studioId}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body as Settings })
      .then(data => { setSaved(data); onChange(data.circles); setError(""); setNotice("") })
      .catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [studioId, reload, onChange])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function resetForm() { setEditing(null); setName(""); setSelected(null); setAddress(""); setMatches([]); setMode("coordinates") }
  function edit(circle: TargetCircle) {
    setEditing(circle.id); setName(circle.name); setLat(String(circle.latitude)); setLon(String(circle.longitude))
    setRadius(String(circle.radiusMiles)); setColor(circle.color); setMode(circle.address ? "address" : "coordinates")
    setAddress(circle.address ?? ""); setSelected(circle.address ? { address: circle.address, latitude: circle.latitude, longitude: circle.longitude } : null); setMatches([])
  }
  function applyCircle() {
    setError(""); setNotice("")
    if (mode === "address" && !selected) { setError("Find and select an address result first."); return }
    if (mode === "coordinates" && (!lat.trim() || !lon.trim())) { setError("Enter both latitude and longitude."); return }
    const parsed = targetCircleSchema.safeParse({
      id: editing ?? crypto.randomUUID(), name, color, radiusMiles: Number(radius),
      latitude: mode === "address" ? selected?.latitude : Number(lat), longitude: mode === "address" ? selected?.longitude : Number(lon),
      address: mode === "address" ? selected?.address : null, visible: circles.find(c => c.id === editing)?.visible ?? true,
    })
    if (!parsed.success) { setError("Enter a name, latitude −85 to 85, longitude −180 to 180, and radius 0.1–500 miles."); return }
    if (!editing && circles.length >= 20) { setError("A studio can have up to 20 circles."); return }
    onChange(editing ? circles.map(c => c.id === editing ? parsed.data : c) : [...circles, parsed.data]); resetForm()
  }
  async function lookup() {
    setBusy(true); setError(""); setMatches([]); setSelected(null)
    try {
      const response = await fetch("/api/marketing/map-targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studioId, address }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setMatches(body.matches); if (!body.matches.length) setError("No address match. Include city, state and ZIP, or use coordinates.")
    } catch (error) { setError(error instanceof Error ? error.message : "Address lookup failed.") }
    finally { setBusy(false) }
  }
  async function save() {
    if (!saved) return
    setBusy(true); setError(""); setNotice("")
    try {
      const response = await fetch("/api/marketing/map-targets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studioId, circles, revision: saved.revision }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setSaved(body); onChange(body.circles); setNotice("Circles saved for this studio.")
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save circles.") }
    finally { setBusy(false) }
  }
  return <details className="mt-4 rounded-lg border p-3">
    <summary className="cursor-pointer text-sm font-medium">Targeting circles ({circles.length}){dirty ? " · Unsaved changes" : ""}</summary>
    <p className="my-2 text-xs text-muted-foreground">Overlapping distance circles are planning overlays, not customer-level coverage or changes to sales totals. Save before changing report filters.</p>
    {error ? <p role="alert" className="my-2 text-sm text-destructive">{error}</p> : null}
    {notice ? <p role="status" className="my-2 text-sm">{notice}</p> : null}
    {!saved ? <p className="text-sm">{error ? <button type="button" className={buttonClass} onClick={() => setReload(n => n + 1)}>Retry loading circles</button> : "Loading saved circles…"}</p> : <>
      <ul className="space-y-2">{circles.map(circle => <li key={circle.id} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
        <span className="size-3 rounded-full border" style={{ backgroundColor: circle.color }} aria-hidden="true" />
        <span className="min-w-0 flex-1">{circle.name} · {circle.radiusMiles} mi{!circle.visible ? " (hidden)" : ""}<span className="block text-xs text-muted-foreground">{circle.address ?? `${circle.latitude}, ${circle.longitude}`}</span></span>
        {saved.canEdit ? <><button type="button" className={buttonClass} disabled={busy} onClick={() => { onChange(circles.map(c => c.id === circle.id ? { ...c, visible: !c.visible } : c)); setNotice("") }}>{circle.visible ? "Hide" : "Show"}</button><button type="button" className={buttonClass} disabled={busy} onClick={() => edit(circle)}>Edit</button><button type="button" className={buttonClass} disabled={busy} aria-label={`Remove ${circle.name}`} onClick={() => { onChange(circles.filter(c => c.id !== circle.id)); if (editing === circle.id) resetForm(); setNotice("") }}>Remove</button></> : null}
      </li>)}</ul>
      {saved.canEdit ? <>
        <fieldset disabled={busy} className="mt-3 space-y-3 border-t pt-3">
          <legend className="px-1 text-sm font-medium">{editing ? "Edit circle" : "Add circle"}</legend>
          <label className="block text-sm" htmlFor={`${prefix}-name`}>Circle name<input id={`${prefix}-name`} className={inputClass} value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Primary target area" /></label>
          <label className="block text-sm" htmlFor={`${prefix}-mode`}>Center from<select id={`${prefix}-mode`} className={inputClass} value={mode} onChange={e => setMode(e.target.value)}><option value="coordinates">Latitude / longitude</option><option value="address">US street address</option></select></label>
          {mode === "coordinates" ? <div className="grid grid-cols-2 gap-2"><label className="text-sm" htmlFor={`${prefix}-lat`}>Latitude<input id={`${prefix}-lat`} className={inputClass} type="number" step="any" min="-85" max="85" value={lat} onChange={e => setLat(e.target.value)} /></label><label className="text-sm" htmlFor={`${prefix}-lon`}>Longitude<input id={`${prefix}-lon`} className={inputClass} type="number" step="any" min="-180" max="180" value={lon} onChange={e => setLon(e.target.value)} /></label></div> : <div className="space-y-2"><label className="block text-sm" htmlFor={`${prefix}-address`}>Full street address<input id={`${prefix}-address`} className={inputClass} maxLength={300} value={address} onChange={e => { setAddress(e.target.value); setSelected(null); setMatches([]) }} /></label><p className="text-xs text-muted-foreground">Find address sends only this address to the US Census Geocoder. Coordinates can be entered without a lookup.</p><button type="button" className={buttonClass} onClick={lookup} disabled={address.trim().length < 8}>Find address</button>{matches.map((match, index) => <label key={index} className="flex gap-2 text-sm"><input type="radio" name={`${prefix}-match`} checked={selected === match} onChange={() => { setSelected(match); setLat(String(match.latitude)); setLon(String(match.longitude)) }} />{match.address} ({match.latitude.toFixed(5)}, {match.longitude.toFixed(5)})</label>)}{selected ? <p className="text-xs">Selected: {selected.address}</p> : null}</div>}
          <div className="grid grid-cols-2 gap-2"><label className="text-sm" htmlFor={`${prefix}-radius`}>Radius (miles)<input id={`${prefix}-radius`} className={inputClass} type="number" min="0.1" max="500" step="0.1" value={radius} onChange={e => setRadius(e.target.value)} /></label><label className="text-sm" htmlFor={`${prefix}-color`}>Circle color<input id={`${prefix}-color`} className="block h-9 w-full rounded border" type="color" value={color} onChange={e => setColor(e.target.value)} /></label></div>
          <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={applyCircle}>{editing ? "Apply circle changes" : "Add to map"}</button>{editing ? <button type="button" className={buttonClass} onClick={resetForm}>Cancel edit</button> : null}</div>
        </fieldset>
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3"><button type="button" className={buttonClass} disabled={busy || !dirty} onClick={save}>{busy ? "Working…" : "Save circles"}</button><button type="button" className={buttonClass} disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard unsaved circle changes and reload?")) { resetForm(); setReload(n => n + 1) } }}>Reload saved circles</button></div>
      </> : <p className="mt-2 text-xs text-muted-foreground">Ask an owner or administrator to edit the studio&apos;s circles.</p>}
    </>}
  </details>
}
