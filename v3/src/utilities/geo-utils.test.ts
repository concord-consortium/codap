import { computeMeanCenter, greatCircleDistance, kEarthMeanRadiusMeters } from "./geo-utils"

describe("computeMeanCenter", () => {
  it("returns undefined for no points", () => {
    expect(computeMeanCenter([])).toBeUndefined()
  })

  it("returns a single point unchanged", () => {
    const center = computeMeanCenter([{ lat: 42, long: -71 }])!
    expect(center.lat).toBeCloseTo(42)
    expect(center.long).toBeCloseTo(-71)
  })

  it("averages points on the sphere", () => {
    const center = computeMeanCenter([{ lat: 0, long: 0 }, { lat: 0, long: 90 }])!
    expect(center.lat).toBeCloseTo(0)
    expect(center.long).toBeCloseTo(45)
    const center2 = computeMeanCenter([{ lat: 10, long: 0 }, { lat: -10, long: 0 }])!
    expect(center2.lat).toBeCloseTo(0)
    expect(center2.long).toBeCloseTo(0)
  })

  it("centers points that straddle the antimeridian near ±180°, not 0°", () => {
    const center = computeMeanCenter([{ lat: 0, long: 179 }, { lat: 0, long: -179 }])!
    expect(center.lat).toBeCloseTo(0)
    expect(Math.abs(center.long)).toBeCloseTo(180)
  })

  it("returns undefined when the points cancel out", () => {
    expect(computeMeanCenter([{ lat: 0, long: 0 }, { lat: 0, long: 180 }])).toBeUndefined()
  })
})

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
