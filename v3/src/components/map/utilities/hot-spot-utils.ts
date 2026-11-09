import { CRS, latLng, Point } from "leaflet"
import { computeMeanCenter, greatCircleDistance } from "../../../utilities/geo-utils"
import { degreesToRadians, quantileOfSortedArray } from "../../../utilities/math-utils"
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

// Spreads smaller than this are floating-point error from coincident points
const kMinSpreadMeters = 0.001

/**
 * Returns the default bandwidth in meters, using the default search radius of ArcGIS's Kernel Density tool:
 * 0.9 · min(SD, √(1/ln 2) · Dm) · n^(−0.2), where SD is the standard distance of the points from their mean center
 * and Dm is their median distance from it.
 */
export function computeDefaultBandwidth(latLongs: ILatLong[]) {
  const center = computeMeanCenter(latLongs)
  if (!center) return kFallbackBandwidthMeters

  const distances = latLongs.map(({ lat, long }) => greatCircleDistance(lat, long, center.lat, center.long))
  const n = distances.length
  const standardDistance = Math.sqrt(distances.reduce((sum, d) => sum + d * d, 0) / n)
  if (standardDistance < kMinSpreadMeters) return kFallbackBandwidthMeters

  const medianDistance = quantileOfSortedArray([...distances].sort((a, b) => a - b), 0.5) ?? 0
  // When more than half of the points are at the mean center, the median is zero, so use SD alone
  const spread = medianDistance < kMinSpreadMeters
    ? standardDistance
    : Math.min(standardDistance, Math.sqrt(1 / Math.LN2) * medianDistance)
  return 0.9 * spread * n ** -0.2
}
