import { ILatLong } from "../components/map/map-types"
import { degreesToRadians, radiansToDegrees } from "./math-utils"

/**
 * Mean radius of the Earth, used for great-circle distances. Note that Leaflet's Web Mercator
 * projection (EPSG:3857) uses a different sphere (radius 6378137 m). Use that radius, not this one,
 * when converting distances to projected map units.
 */
export const kEarthMeanRadiusMeters = 6371000

/**
 * Returns the great-circle (haversine) distance in meters between two points given in degrees.
 */
export function greatCircleDistance(lat1: number, long1: number, lat2: number, long2: number) {
  const deltaLat = degreesToRadians(lat2 - lat1)
  const deltaLong = degreesToRadians(long2 - long1)
  const a = Math.sin(deltaLat / 2) ** 2 +
            Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.sin(deltaLong / 2) ** 2
  const clampedA = Math.min(1, Math.max(0, a))
  return 2 * kEarthMeanRadiusMeters * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA))
}

/**
 * Returns the mean center of the points, found by averaging them as 3D unit vectors. Unlike averaging
 * latitudes and longitudes, this works for points that straddle the antimeridian. Returns undefined
 * when there are no points, or when they cancel out (e.g. two antipodal points).
 */
export function computeMeanCenter(latLongs: ILatLong[]): Maybe<ILatLong> {
  if (!latLongs.length) return
  let x = 0
  let y = 0
  let z = 0
  latLongs.forEach(({ lat, long }) => {
    const phi = degreesToRadians(lat)
    const lambda = degreesToRadians(long)
    x += Math.cos(phi) * Math.cos(lambda)
    y += Math.cos(phi) * Math.sin(lambda)
    z += Math.sin(phi)
  })
  if (Math.hypot(x, y, z) / latLongs.length < 1e-12) return
  // The sums don't need dividing by the number of points, because atan2 only uses their ratios
  return { lat: radiansToDegrees(Math.atan2(z, Math.hypot(x, y))), long: radiansToDegrees(Math.atan2(y, x)) }
}
