import { Point, Projection } from "leaflet"
import { greatCircleDistance } from "../../../utilities/geo-utils"
import {
  bandwidthToWorldUnits, computeDefaultBandwidth, kFallbackBandwidthMeters, kMaxMercatorLatitude,
  kWebMercatorRadiusMeters, kWorldSize, latLongToWorldPoint
} from "./hot-spot-utils"

describe("hot spot constants", () => {
  it("match Leaflet's Web Mercator projection", () => {
    const sphericalMercator = Projection.SphericalMercator as unknown as { R: number, MAX_LATITUDE: number }
    expect(kWebMercatorRadiusMeters).toBe(sphericalMercator.R)
    expect(kMaxMercatorLatitude).toBe(sphericalMercator.MAX_LATITUDE)
  })
})

describe("latLongToWorldPoint", () => {
  it("maps the world onto a 256 × 256 square", () => {
    const expectPoint = (actual: Point, x: number, y: number) => {
      expect(actual.x).toBeCloseTo(x)
      expect(actual.y).toBeCloseTo(y)
    }
    expectPoint(latLongToWorldPoint({ lat: 0, long: 0 }), 128, 128)
    expectPoint(latLongToWorldPoint({ lat: 0, long: -180 }), 0, 128)
    expectPoint(latLongToWorldPoint({ lat: 0, long: 180 }), 256, 128)
    expectPoint(latLongToWorldPoint({ lat: kMaxMercatorLatitude, long: 0 }), 128, 0)
  })

  it("clamps latitudes beyond the Mercator limit", () => {
    expect(latLongToWorldPoint({ lat: 90, long: 0 }).y).toBeCloseTo(0)
    expect(latLongToWorldPoint({ lat: -90, long: 0 }).y).toBeCloseTo(256)
  })
})

describe("bandwidthToWorldUnits", () => {
  const metersPerWorldUnitAtEquator = 2 * Math.PI * kWebMercatorRadiusMeters / kWorldSize

  it("converts meters at the equator", () => {
    expect(bandwidthToWorldUnits(metersPerWorldUnitAtEquator, 0)).toBeCloseTo(1)
  })

  it("grows with the Mercator scale at higher latitudes", () => {
    expect(bandwidthToWorldUnits(1000, 60)).toBeCloseTo(2 * bandwidthToWorldUnits(1000, 0))
    expect(bandwidthToWorldUnits(1000, -60)).toBeCloseTo(bandwidthToWorldUnits(1000, 60))
  })

  it("clamps latitudes beyond the Mercator limit", () => {
    expect(bandwidthToWorldUnits(1000, 89)).toBeCloseTo(bandwidthToWorldUnits(1000, kMaxMercatorLatitude))
  })
})

describe("computeDefaultBandwidth", () => {
  const oneDegree = greatCircleDistance(0, 0, 0, 1)

  it("uses the standard distance when it is smaller than the median term", () => {
    // mean center (0, 0); distances [d, 0, d]; SD = √(2/3)·d < √(1/ln 2)·d
    const latLongs = [{ lat: 0, long: -1 }, { lat: 0, long: 0 }, { lat: 0, long: 1 }]
    expect(computeDefaultBandwidth(latLongs)).toBeCloseTo(0.9 * Math.sqrt(2 / 3) * oneDegree * 3 ** -0.2, 3)
  })

  it("uses the median term when it is smaller than the standard distance", () => {
    // symmetric, so the mean center is (0, 0); the median distance is 0.1°, and SD is dominated by the ±5° points
    const latLongs = [
      { lat: 0, long: 0 }, { lat: 0, long: 0.1 }, { lat: 0, long: -0.1 }, { lat: 0, long: 5 }, { lat: 0, long: -5 }
    ]
    const median = greatCircleDistance(0, 0, 0, 0.1)
    expect(computeDefaultBandwidth(latLongs)).toBeCloseTo(0.9 * Math.sqrt(1 / Math.LN2) * median * 5 ** -0.2, 3)
  })

  it("uses the standard distance when more than half the points are at the mean center", () => {
    // distances [0, 0, 0, d, d]: the median is 0, SD = √(2/5)·d
    const latLongs = [
      { lat: 0, long: 0 }, { lat: 0, long: 0 }, { lat: 0, long: 0 }, { lat: 0, long: 1 }, { lat: 0, long: -1 }
    ]
    expect(computeDefaultBandwidth(latLongs)).toBeCloseTo(0.9 * Math.sqrt(2 / 5) * oneDegree * 5 ** -0.2, 3)
  })

  it("falls back when there is no spread", () => {
    expect(computeDefaultBandwidth([])).toBe(kFallbackBandwidthMeters)
    expect(computeDefaultBandwidth([{ lat: 42, long: -71 }])).toBe(kFallbackBandwidthMeters)
    expect(computeDefaultBandwidth([{ lat: 42, long: -71 }, { lat: 42, long: -71 }])).toBe(kFallbackBandwidthMeters)
  })

  it("falls back when the points have no mean center", () => {
    expect(computeDefaultBandwidth([{ lat: 0, long: 0 }, { lat: 0, long: 180 }])).toBe(kFallbackBandwidthMeters)
  })

  it("gives the same result for a cluster across the antimeridian as for the same cluster elsewhere", () => {
    const acrossDateline = [{ lat: 10, long: 179 }, { lat: 10.5, long: 179.5 }, { lat: 9.5, long: -179.5 }]
    const nearGreenwich = [{ lat: 10, long: -1 }, { lat: 10.5, long: -0.5 }, { lat: 9.5, long: 0.5 }]
    expect(computeDefaultBandwidth(acrossDateline)).toBeCloseTo(computeDefaultBandwidth(nearGreenwich), 3)
  })
})
