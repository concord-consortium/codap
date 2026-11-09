import { Point, Projection } from "leaflet"
import {
  bandwidthToWorldUnits, kMaxMercatorLatitude, kWebMercatorRadiusMeters, kWorldSize, latLongToWorldPoint
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
