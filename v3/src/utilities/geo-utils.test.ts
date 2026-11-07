import { greatCircleDistance, kEarthMeanRadiusMeters } from "./geo-utils"

describe("greatCircleDistance", () => {
  it("returns 0 for identical points", () => {
    expect(greatCircleDistance(40, -74, 40, -74)).toBe(0)
  })

  it("returns distances in meters", () => {
    // New York to San Francisco; matches the formula function's test (4128 km)
    expect(greatCircleDistance(40.66, -74, 37.8, -122.4) / 1000).toBeCloseTo(4128, -1)
    // New York to London (5571 km)
    expect(greatCircleDistance(40.7128, -74.0060, 51.5074, -0.1278) / 1000).toBeCloseTo(5571, -1)
  })

  it("measures one degree of latitude as 1/360 of the circumference", () => {
    expect(greatCircleDistance(0, 0, 1, 0)).toBeCloseTo(2 * Math.PI * kEarthMeanRadiusMeters / 360, 3)
  })

  it("takes the short way across the antimeridian", () => {
    // 179°E to 179°W at the equator is 2° apart, not 358°
    expect(greatCircleDistance(0, 179, 0, -179)).toBeCloseTo(greatCircleDistance(0, 0, 0, 2), 3)
  })

  it("is symmetric", () => {
    expect(greatCircleDistance(10, 20, -30, 40)).toBeCloseTo(greatCircleDistance(-30, 40, 10, 20), 6)
  })
})
