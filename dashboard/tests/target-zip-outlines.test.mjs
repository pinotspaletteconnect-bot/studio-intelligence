import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const source = readFileSync(new URL("../components/studio/operations/zip-code-map.tsx", import.meta.url), "utf8")
test("ZIP overlay has no fill and stays above circles without intercepting hover", () => {
  const layer = source.slice(source.indexOf('<g data-map-layer="target-zip-outlines"'), source.indexOf("{topTen.map(row =>"))
  assert.match(layer, /fill="none" pointerEvents="none"/)
  assert.match(layer, /<path[^>]*fill="none" stroke=\{zipTargets.color\}/)
  assert.match(layer, /vectorEffect="non-scaling-stroke"/)
  assert.ok(source.indexOf("{overlays.map(") < source.indexOf('data-map-layer="target-zip-outlines"'))
})
test("target boundaries are included even without top-ten sales and missing boundaries are disclosed", () => {
  assert.match(source, /if \(!highlighted.length\) return targetFeatures/)
  assert.match(source, /targetFeatures.includes\(feature\)/)
  assert.match(source, /No boundary currently available for:/)
})
