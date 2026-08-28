import assert from "node:assert/strict"
import { test } from "node:test"
import { geoArea, geoDistance, geoMercator, geoPath } from "d3-geo"
import { circleGeometry, emptyZipTargets, parseTargetZipCodes, readTargetSettings, resolveZipTargets, targetCircleSchema, targetCirclesSchema, zipTargetsSchema } from "../lib/maps/target-circles.ts"

const circle = { id: "30bc9c58-12da-4dda-8298-47bcbbf428c9", name: "Short North target", latitude: 39.97657, longitude: -83.00349, radiusMiles: 5, color: "#dc2626", visible: true, address: null }
test("radius is a true five-mile great-circle distance", () => {
  const geometry = circleGeometry(circle)
  for (const coordinate of geometry.coordinates[0]) {
    const miles = geoDistance([circle.longitude, circle.latitude], coordinate) * 6371008.8 / 1609.344
    assert.ok(Math.abs(miles - 5) < 0.00001)
  }
  assert.ok(geoArea(geometry) < 0.001, "circle must not cover the complement of the globe")
})
test("circle size remains geographic at different latitudes", () => {
  for (const latitude of [0, 33.3, 60, -45]) {
    const geometry = circleGeometry({ ...circle, latitude, radiusMiles: 12.5 })
    const distance = geoDistance([circle.longitude, latitude], geometry.coordinates[0][0]) * 6371008.8 / 1609.344
    assert.ok(Math.abs(distance - 12.5) < 0.00001)
  }
})
test("overlapping circles render as independent projected shapes", () => {
  const small = circleGeometry(circle), large = circleGeometry({ ...circle, radiusMiles: 10 })
  const projection = geoMercator().fitExtent([[18, 18], [542, 372]], { type: "GeometryCollection", geometries: [small, large] })
  const path = geoPath(projection)
  assert.ok(path(small)); assert.ok(path(large)); assert.notEqual(path(small), path(large))
  assert.ok(path.area(large) > path.area(small) * 3.9)
})
test("valid inputs include coordinate zero and minimum and maximum radii", () => {
  assert.equal(targetCircleSchema.safeParse({ ...circle, latitude: 0, longitude: 0, radiusMiles: 0.1 }).success, true)
  assert.equal(targetCircleSchema.safeParse({ ...circle, radiusMiles: 500 }).success, true)
})
test("reject invalid coordinates, radii, colors and blank names", () => {
  for (const patch of [{ latitude: null }, { latitude: 86 }, { longitude: 181 }, { latitude: NaN }, { radiusMiles: 0 }, { radiusMiles: -1 }, { radiusMiles: 501 }, { radiusMiles: Infinity }, { color: "red" }, { name: " " }]) {
    assert.equal(targetCircleSchema.safeParse({ ...circle, ...patch }).success, false)
  }
})
test("reject duplicate IDs and more than twenty circles", () => {
  assert.equal(targetCirclesSchema.safeParse([circle, circle]).success, false)
  assert.equal(targetCirclesSchema.safeParse(Array.from({ length: 21 }, () => ({ ...circle, id: crypto.randomUUID() }))).success, false)
})
test("empty settings are backward compatible; malformed stored settings fail closed", () => {
  assert.deepEqual(readTargetSettings({ map_location: { latitude: 39 } }), { circles: [], zipTargets: emptyZipTargets, revision: null })
  assert.throws(() => readTargetSettings({ map_targets: { circles: "broken" } }))
})
test("saved settings preserve address, visibility, and revision", () => {
  const settings = { circles: [{ ...circle, visible: false, address: "691 N High Street, Columbus OH" }], revision: crypto.randomUUID() }
  assert.deepEqual(readTargetSettings({ map_targets: settings }), { ...settings, zipTargets: emptyZipTargets })
})

test("ZIP entry preserves leading zeros and deduplicates pasted lists", () => {
  assert.deepEqual(parseTargetZipCodes("02108, 43201\n43215;43201\t02108"), ["02108", "43201", "43215"])
  assert.deepEqual(parseTargetZipCodes("  "), [])
  for (const text of ["2108", "43201-1234", "43201x", "43 201", "<script>"]) assert.throws(() => parseTargetZipCodes(text))
  assert.throws(() => parseTargetZipCodes(Array.from({ length: 201 }, (_, i) => String(10000 + i)).join(",")))
})

test("server validates ZIP lists and border color", () => {
  assert.equal(zipTargetsSchema.safeParse({ codes: ["02108", "43201"], color: "#d946ef" }).success, true)
  for (const targets of [{ codes: [43201], color: "#d946ef" }, { codes: ["43201", "43201"], color: "#d946ef" }, { codes: ["43201"], color: "red" }, { codes: ["43201"], color: "#d946ef", fill: true }]) {
    assert.equal(zipTargetsSchema.safeParse(targets).success, false)
  }
})

test("saved ZIP targets round-trip alongside circles without touching studio location", () => {
  const settings = { circles: [circle], zipTargets: { codes: ["02108", "43201"], color: "#aabbcc" }, revision: crypto.randomUUID() }
  const config = { map_location: { latitude: 39 }, map_targets: settings }
  assert.deepEqual(readTargetSettings(config), settings)
  assert.deepEqual(config.map_location, { latitude: 39 })
  assert.throws(() => readTargetSettings({ map_targets: { ...settings, zipTargets: { codes: ["bad"], color: "#aabbcc" } } }))
})

test("old circle-only clients preserve ZIP targets; an explicit empty list removes them", () => {
  const current = { codes: ["43201"], color: "#aabbcc" }
  assert.deepEqual(resolveZipTargets(current, undefined), current)
  assert.deepEqual(resolveZipTargets(current, emptyZipTargets), emptyZipTargets)
})
