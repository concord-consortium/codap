import { degreesToRadians } from "./math-utils"

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
  return 2 * kEarthMeanRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
