import { computeBoundsFromCoordinates, getRationalLongitudeBounds } from "./map-utils"

describe("getRationalLongitudeBounds", () => {
  it("returns the original min/max when span <= 180", () => {
    const result = getRationalLongitudeBounds([-100, -90, -80, -70])
    expect(result.min).toBe(-100)
    expect(result.max).toBe(-70)
  })

  it("handles Alaska-like data crossing the date line", () => {
    // Alaska spans from about 172°E to 130°W (-130°)
    // Naive span: -130 to 172 = 302°, but actual span crossing date line is ~58°
    const result = getRationalLongitudeBounds([172, 175, 178, -178, -175, -170, -160, -140, -130])
    expect(result.max - result.min).toBeLessThanOrEqual(180)
    expect(result.max - result.min).toBeCloseTo(58, 0)
  })

  it("handles Pacific-centered data near the date line", () => {
    // Points clustered on both sides of the date line
    const result = getRationalLongitudeBounds([170, 175, 179, -179, -175, -170])
    expect(result.max - result.min).toBeLessThanOrEqual(180)
    expect(result.max - result.min).toBeCloseTo(20, 0)
  })

  it("handles all-positive longitudes", () => {
    const result = getRationalLongitudeBounds([10, 20, 30, 40, 50])
    expect(result.min).toBe(10)
    expect(result.max).toBe(50)
  })

  it("handles all-negative longitudes", () => {
    const result = getRationalLongitudeBounds([-150, -120, -100, -80])
    expect(result.min).toBe(-150)
    expect(result.max).toBe(-80)
  })

  it("handles exactly 2 values crossing the date line", () => {
    const result = getRationalLongitudeBounds([-170, 170])
    expect(result.max - result.min).toBeLessThanOrEqual(180)
    expect(result.max - result.min).toBeCloseTo(20, 0)
  })
})

describe("computeBoundsFromCoordinates", () => {
  it("returns undefined for empty arrays", () => {
    expect(computeBoundsFromCoordinates([], [])).toBeUndefined()
    expect(computeBoundsFromCoordinates([10], [])).toBeUndefined()
    expect(computeBoundsFromCoordinates([], [10])).toBeUndefined()
  })

  it("computes correct bounds for normal data", () => {
    const bounds = computeBoundsFromCoordinates([30, 40, 50], [-100, -90, -80])!
    expect(bounds.getSouth()).toBe(30)
    expect(bounds.getNorth()).toBe(50)
    expect(bounds.getWest()).toBe(-100)
    expect(bounds.getEast()).toBe(-80)
  })

  it("computes correct bounds when longitudes cross the date line", () => {
    const bounds = computeBoundsFromCoordinates(
      [50, 55, 60, 65, 52, 58],
      [172, 175, 178, -178, -160, -130]
    )!
    expect(bounds.getSouth()).toBe(50)
    expect(bounds.getNorth()).toBe(65)
    const lngSpan = bounds.getEast() - bounds.getWest()
    expect(lngSpan).toBeLessThanOrEqual(180)
  })

  it("handles single point", () => {
    const bounds = computeBoundsFromCoordinates([45], [-122])!
    expect(bounds.getSouth()).toBe(45)
    expect(bounds.getNorth()).toBe(45)
    expect(bounds.getWest()).toBe(-122)
    expect(bounds.getEast()).toBe(-122)
  })
})
