import { circleGeometry } from "./target-circles"

// Presentation extent only: this never filters or changes order metrics.
export function zipViewportGeometry(
  latitude: number | null,
  longitude: number | null,
  showAll: boolean,
  geometries: GeoJSON.Geometry[],
): GeoJSON.Geometry[] {
  if (!showAll && latitude !== null && longitude !== null) {
    return [circleGeometry({ latitude, longitude, radiusMiles: 25 })]
  }
  return geometries
}
