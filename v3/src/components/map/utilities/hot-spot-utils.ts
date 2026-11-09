import { CRS, latLng, Point } from "leaflet"
import { degreesToRadians } from "../../../utilities/math-utils"
import { ILatLong } from "../map-types"

/** Grid cell side length, in CSS pixels */
export const kHotSpotCellSize = 2
/** Kernels are truncated outside a square window of this many bandwidths in each direction */
export const kKernelCutoff = 3
/** Extra canvas margin around the viewport, as a fraction of each dimension, on each side */
export const kHotSpotPadding = 0.1
/** Bandwidth used when the points have no spread */
export const kFallbackBandwidthMeters = 10000
/** Radius of the sphere used by Leaflet's Web Mercator projection (EPSG:3857) */
export const kWebMercatorRadiusMeters = 6378137
/** Leaflet's Web Mercator latitude limit */
export const kMaxMercatorLatitude = 85.0511287798
/** Width and height of the world in Leaflet's zoom-0 pixel coordinates */
export const kWorldSize = 256

/** Projects a lat/long to Leaflet's zoom-0 world coordinates, in which the world is a 256 × 256 square. */
export function latLongToWorldPoint({ lat, long }: ILatLong): Point {
  return CRS.EPSG3857.latLngToPoint(latLng(lat, long), 0)
}

/**
 * Converts a distance on the ground near the given latitude to zoom-0 world units. Mercator stretches the map by
 * 1/cos(latitude), so a kernel of this many world units covers about bandwidthMeters on the ground.
 */
export function bandwidthToWorldUnits(bandwidthMeters: number, lat: number) {
  const clampedLat = Math.max(-kMaxMercatorLatitude, Math.min(kMaxMercatorLatitude, lat))
  const metersPerWorldUnit =
    2 * Math.PI * kWebMercatorRadiusMeters * Math.cos(degreesToRadians(clampedLat)) / kWorldSize
  return bandwidthMeters / metersPerWorldUnit
}
