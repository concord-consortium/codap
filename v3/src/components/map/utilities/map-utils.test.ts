import {
  computeBoundsFromCoordinates, getRationalLongitudeBounds, shiftLongitudeIntoView
} from "./map-utils"

describe("getRationalLongitudeBounds", () => {
  it("returns canonical min/max when all values fit within 180° of canonical range", () => {
    const result = getRationalLongitudeBounds([-100, -90, -80, -70])
    expect(result.min).toBe(-100)
    expect(result.max).toBe(-70)
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

  it("returns canonical bounds when the wrap-around gap is the largest", () => {
    // Evenly spaced points spanning 200°: every inter-point gap is 20°, and the
    // wrap gap is 160° — the canonical arc is the smallest enclosing one.
    const longs = [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100]
    const result = getRationalLongitudeBounds([...longs])
    expect(result.min).toBe(-100)
    expect(result.max).toBe(100)
  })

  it("handles Alaska-like data crossing the date line", () => {
    // Cluster from 172°E through the dateline to 130°W: the 302° gap dominates
    // so the compact arc goes east from 172° to -130° (expressed as +230°).
    const result = getRationalLongitudeBounds([172, 175, 178, -178, -175, -170, -160, -140, -130])
    expect(result.min).toBe(172)
    expect(result.max).toBe(230)
    expect(result.max - result.min).toBe(58)
  })

  it("handles data tightly clustered across the date line", () => {
    // Hawaii (-159, -158) and Russia (175, 176, 176.25) clusters: the 333° gap
    // between the clusters is larger than the 24.75° wrap gap, so we get a
    // 27° dateline-crossing arc.
    const result = getRationalLongitudeBounds([-159, -158, 175, 176, 176.25])
    expect(result.min).toBe(175)
    expect(result.max).toBe(202)
    expect(result.max - result.min).toBeLessThanOrEqual(180)
  })

  it("picks the dateline-crossing arc when an inter-point gap exceeds the wrap gap (CODAP-1384)", () => {
    // Subset of the CODAP-1384 longitudes: the gap between -123.1 and -77.3 is
    // 45.8°, larger than the 24.29° wrap gap, so the shortest enclosing arc
    // crosses the date line. Renderers must use shiftLongitudeIntoView so points
    // at canonical -159.46 etc. land inside this non-canonical viewport.
    const longs = [-159.46, -123.1, -77.3, -43.1, -9.2, 4.5, 8.5, 39.6, 72.8, 114.2, 153.0, 176.25]
    const result = getRationalLongitudeBounds([...longs])
    expect(result.min).toBe(-77.3)
    expect(result.max).toBeCloseTo(236.9, 10)
  })

  it("canonicalizes input values outside the [-180, 180] range", () => {
    // 200° = canonical -160°; -200° = canonical 160°. With three points at
    // canonical -160, 0, 160, every inter-point gap is 160° and wrap is 40°,
    // so the dateline-crossing arc wins.
    const result = getRationalLongitudeBounds([200, -200, 0])
    expect(result.min).toBe(0)
    expect(result.max).toBe(200)
  })

  it("ignores non-finite values", () => {
    const result = getRationalLongitudeBounds([NaN, -100, Infinity, 0, -Infinity, 50])
    expect(result.min).toBe(-100)
    expect(result.max).toBe(50)
  })

  it("returns NaN bounds when no finite values are provided", () => {
    const result = getRationalLongitudeBounds([NaN, Infinity, -Infinity])
    expect(result.min).toBeNaN()
    expect(result.max).toBeNaN()
  })

  it("handles a single value", () => {
    const result = getRationalLongitudeBounds([42])
    expect(result.min).toBe(42)
    expect(result.max).toBe(42)
  })

  it("handles exactly 2 values crossing the date line", () => {
    const result = getRationalLongitudeBounds([-170, 170])
    expect(result.min).toBe(170)
    expect(result.max).toBe(190)
    expect(result.max - result.min).toBe(20)
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

  it("returns a compact dateline-crossing arc for clustered antimeridian data", () => {
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

  it("canonicalizes out-of-range longitudes", () => {
    const bounds = computeBoundsFromCoordinates([10, 20], [200, -200])!
    // 200° canonicalizes to -160°, -200° to 160°. The 40° wrap gap is smaller
    // than the 320° inter-point gap, so we get the compact 40° dateline arc.
    expect(bounds.getWest()).toBe(160)
    expect(bounds.getEast()).toBe(200)
  })
})

describe("shiftLongitudeIntoView", () => {
  it("returns the longitude unchanged when already in the viewport", () => {
    expect(shiftLongitudeIntoView(100, -180, 180)).toBe(100)
    expect(shiftLongitudeIntoView(-50, -180, 180)).toBe(-50)
  })

  it("leaves the antimeridian endpoints unshifted in a whole-world view (no dateline split)", () => {
    // [-180, 180] spans exactly 360°: rounding (center - lng)/360 would tie at lng = -180 and shift
    // it to 180, jumping a dateline-crossing connecting line across the whole map. Endpoints stay put.
    expect(shiftLongitudeIntoView(-180, -180, 180)).toBe(-180)
    expect(shiftLongitudeIntoView(180, -180, 180)).toBe(180)
  })

  it("leaves a point just outside a normal viewport at its nearest world copy (CODAP-1412)", () => {
    // Regression: a point a fraction of a degree outside a narrow, non-dateline viewport must NOT be
    // flung a whole 360° away (which projected it to ~±infinity pixels and broke connecting lines).
    expect(shiftLongitudeIntoView(14.97, 13, 14.8)).toBeCloseTo(14.97)   // just east of east bound
    expect(shiftLongitudeIntoView(12.5, 13, 14.8)).toBeCloseTo(12.5)     // just west of west bound
  })

  it("keeps a point far outside a normal viewport at its true longitude (CODAP-1412)", () => {
    // The point stays in the same world copy as the viewport, so a connecting line to it heads off
    // in the correct direction (off the near edge) rather than being clamped or wrapped to the far side.
    expect(shiftLongitudeIntoView(30, 13, 14.8)).toBe(30)     // far east — line should exit the east edge
    expect(shiftLongitudeIntoView(-10, 13, 14.8)).toBe(-10)   // far west — line should exit the west edge
  })

  it("shifts a negative-canonical longitude into a dateline-crossing viewport", () => {
    // Viewport showing the Russia + Hawaii cluster crossing the dateline.
    // Canonical -159° belongs in the next world copy of this viewport.
    expect(shiftLongitudeIntoView(-159, 175, 201)).toBe(201)
  })

  it("shifts a positive-canonical longitude into a viewport that starts below -180", () => {
    expect(shiftLongitudeIntoView(176, -185, -159)).toBe(-184)
  })

  it("leaves longitudes within a dateline-crossing viewport unchanged", () => {
    expect(shiftLongitudeIntoView(178, 175, 201)).toBe(178)
    expect(shiftLongitudeIntoView(200, 175, 201)).toBe(200)
  })

  it("does not pull a point inside a viewport it cannot reach", () => {
    // A 26° viewport near the dateline can't contain a Greenwich point.
    // The shift still attempts a single rotation, but the result remains
    // outside the viewport so the point renders off-screen.
    const result = shiftLongitudeIntoView(0, 175, 201)
    expect(result < 175 || result > 201).toBe(true)
  })

  it("applies multiple rotations when a single 360° shift is not enough", () => {
    // A point at -500° is two full rotations west of the viewport.
    expect(shiftLongitudeIntoView(-500, 175, 201)).toBe(220)
    // A point at +700° lands at its nearest world copy of the viewport: 700 - 2×360 = -20
    // (139° from the viewport), which is closer than the next copy at -380 (195° away).
    expect(shiftLongitudeIntoView(700, -185, -159)).toBe(-20)
  })
})
