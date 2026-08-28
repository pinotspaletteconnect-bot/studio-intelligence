# Studio map targeting circles

Status: feature deployed August 28 via PR #56. Live save testing exposed a
same-origin rejection. The local repair uses the existing trusted `APP_URL`
instead of comparing against the reverse proxy's internal request URL.
Repair deployed via PR #57; successful live save/reload remains unverified.

August 28 local addition (not deployed): each studio can save up to 200 target
ZIP codes with one configurable border color. Target paths explicitly have no
fill, render above circles, and do not replace existing sales shading. Paste
comma/space/newline-separated five-digit codes, including leading zeros;
duplicates are removed. Clearing the list removes the outlines on save.
Boundaries outside the top-ten-sales region are included and fitted even with
no sales. Missing regional Census ZCTA boundaries are reported by ZIP; codes
are retained, not silently dropped. No new boundary provider is introduced.

## User contract

- Each studio has independent circles, shared with its authorized viewers.
- Owners and administrators can add/edit/hide/remove and explicitly save up to
  20 circles. Changes preview locally before saving. Reload saved circles can
  discard unsaved changes. Save before changing report dates/studio filters.
- Center: latitude/longitude, or a complete US street address. Address lookup
  runs only on clicking Find address, with a visible disclosure that the address
  is sent to the US Census Geocoder. The user selects a result before applying
  it. No customer orders or ZIP sales are sent to the provider. Coordinates
  do not require a lookup. Unmatched addresses can use coordinates instead.
- Radius: 0.1–500 miles. Latitude: −85 to 85 (Mercator map); longitude: −180 to
  180. Names and colors identify overlapping areas; translucent fills preserve
  the underlying ZIP shading. Circles fit the map viewport and follow zoom.
- The existing map boundary assets cover selected US regions, not a global
  basemap. Circles outside those regions still render but may have no surrounding
  ZIP polygons. Circles remain editable without sales in the selected period.
- These are visual targeting plans, not driving-distance isochrones, actual
  advertising platform settings, or exact customer coverage. ZIP aggregates
  cannot identify individual customers inside a radius.

## Architecture

`TargetCircleEditor → /api/marketing/map-targets → map-targets service →
studio_integrations.configuration.map_targets`.

GET returns circles, revision and edit permission. PUT validates input and
updates an existing active PTS integration, never inserts an integration.
POST performs the address lookup. All operations require authenticated,
onboarded, legally accepted users with studio access; writes/lookups additionally
require owner/admin access and same-origin requests. No new table or column.
The mutation origin guard uses the configured canonical app origin, ignores
Host/forwarded headers, and fails closed without production URL configuration.

Persisted JSON contains circles, revision UUID, update timestamp and updater ID.
It now also accepts optional `zipTargets: { codes: string[], color: string }`.
Legacy configurations default to an empty list. Old clients omitting ZIP
targets preserve the stored list; new clients save both through the same
revision-checked request. No table/column changes or new integrations.
PUT checks the client revision and atomically compares the original full JSON
configuration. Any concurrent configuration change results in 409; unrelated
integration settings are not overwritten. Invalid stored circles fail closed.

Geometry uses d3 `geoCircle`, with meters divided by mean Earth radius 6371008.8
and converted to angular degrees. GeoJSON circles are projected alongside ZIP
geometry; SVG pixel circles are not used for distance boundaries.

References:
- https://d3js.org/d3-geo/shape
- https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html

## Verification and rollout

Run `node --test tests/map-target-circles.test.mjs` from dashboard (Node 24),
then lint and build. In a worktree with dependency junctions, Turbopack may
reject the external filesystem root; `npm run build -- --webpack` is a
supported alternative. Placeholder Supabase variables suffice for build checks.

Before release validation: approve dashboard deployment; test two overlapping
circles on one studio, edit center/radius/name/color, save and reload; verify
another studio is unchanged; verify viewer and cross-tenant requests are denied;
test concurrent saves yield 409; check address matching/no-match/failure and
mobile layout. Do not publish a testing-only route or bypass authentication.

Rollback: revert the dashboard feature. Existing saved `map_targets` JSON can
remain harmlessly in configuration; no data deletion or schema rollback needed.
