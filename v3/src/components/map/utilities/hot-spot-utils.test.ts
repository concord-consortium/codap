import { Point, Projection } from "leaflet"
import { greatCircleDistance } from "../../../utilities/geo-utils"
import {
  bandwidthToWorldUnits, computeDefaultBandwidth, computeHotSpotSurface, computeMaxDensity, IKernel, kernelWeight,
  kFallbackBandwidthMeters, kMaxMercatorLatitude, kWebMercatorRadiusMeters, kWorldSize, latLongToWorldPoint,
  wrapWorldDelta
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

describe("kernelWeight", () => {
  it("is a Gaussian of distance in bandwidths", () => {
    expect(kernelWeight(0, 0, 2)).toBe(1)
    expect(kernelWeight(2, 0, 2)).toBeCloseTo(Math.exp(-0.5))
    expect(kernelWeight(3, 4, 5)).toBeCloseTo(Math.exp(-0.5))
  })

  it("is zero outside a square window of kKernelCutoff bandwidths", () => {
    expect(kernelWeight(3.01, 0, 1)).toBe(0)
    expect(kernelWeight(0, -3.01, 1)).toBe(0)
    // corners of the square are inside the window
    expect(kernelWeight(2.9, 2.9, 1)).toBeGreaterThan(0)
  })
})

describe("wrapWorldDelta", () => {
  it("takes the short way around the world", () => {
    expect(wrapWorldDelta(10)).toBe(10)
    expect(wrapWorldDelta(-255)).toBe(1)
    expect(wrapWorldDelta(250)).toBe(-6)
  })
})

describe("computeMaxDensity", () => {
  // Brute-force maximum over a fine grid covering [95, 110] × [95, 108]
  function bruteForceMax(kernels: IKernel[]) {
    let max = 0
    for (let x = 95; x <= 110; x += 0.05) {
      for (let y = 95; y <= 108; y += 0.05) {
        max = Math.max(max, kernels.reduce((sum, k) => sum + kernelWeight(k.x - x, k.y - y, k.h), 0))
      }
    }
    return max
  }
  const cluster: Array<[number, number]> =
    [[100, 100], [101.2, 100.5], [100.4, 101.6], [103, 102], [99, 103.1], [102.2, 99.1], [105, 100]]

  it("returns 0 for no points and 1 for one point", () => {
    expect(computeMaxDensity([])).toBe(0)
    expect(computeMaxDensity([{ x: 100, y: 100, h: 1 }])).toBe(1)
  })

  it("finds a maximum between two points", () => {
    // f = 1 + e⁻² ≈ 1.135 at each point, but 2e^(−½) ≈ 1.213 at the midpoint
    const kernels = [{ x: 100, y: 100, h: 1 }, { x: 102, y: 100, h: 1 }]
    expect(computeMaxDensity(kernels)).toBeCloseTo(2 * Math.exp(-0.5), 3)
  })

  it("returns 1 for points farther apart than the cutoff", () => {
    expect(computeMaxDensity([{ x: 100, y: 100, h: 1 }, { x: 110, y: 100, h: 1 }])).toBe(1)
  })

  it("measures points across the antimeridian as neighbors", () => {
    // 1 world unit apart across the wrap, not 255; the midpoint density is 2e^(−⅛)
    const kernels = [{ x: 255.5, y: 100, h: 1 }, { x: 0.5, y: 100, h: 1 }]
    expect(computeMaxDensity(kernels)).toBeCloseTo(2 * Math.exp(-0.125), 3)
  })

  it("matches a brute-force search, which beats evaluating only at the points", () => {
    const kernels = cluster.map(([x, y]) => ({ x, y, h: 1 }))
    const maxAtPoints = Math.max(...kernels.map(p =>
      kernels.reduce((sum, k) => sum + kernelWeight(k.x - p.x, k.y - p.y, k.h), 0)))
    const max = computeMaxDensity(kernels)
    expect(max).toBeCloseTo(bruteForceMax(kernels), 2)
    expect(max).toBeGreaterThan(maxAtPoints + 0.1)   // ≈ 2.254 vs. 2.121
  })

  it("matches a brute-force search with varying bandwidths", () => {
    const kernels = cluster.map(([x, y], i) => ({ x, y, h: i % 2 ? 1.5 : 1 }))
    expect(computeMaxDensity(kernels)).toBeCloseTo(bruteForceMax(kernels), 2)
  })
})

describe("computeHotSpotSurface", () => {
  const latLongs = [{ lat: 40, long: -100 }, { lat: 41, long: -101 }, { lat: 39, long: -99 }]

  it("is undefined without points", () => {
    expect(computeHotSpotSurface([])).toBeUndefined()
  })

  it("projects each point to world coordinates with its own bandwidth", () => {
    const surface = computeHotSpotSurface(latLongs, 20000)!
    expect(surface.bandwidthMeters).toBe(20000)
    surface.points.forEach((point, i) => {
      expect(point.latLong).toEqual(latLongs[i])
      expect(point.x).toBeCloseTo(latLongToWorldPoint(latLongs[i]).x)
      expect(point.y).toBeCloseTo(latLongToWorldPoint(latLongs[i]).y)
      expect(point.h).toBeCloseTo(bandwidthToWorldUnits(20000, latLongs[i].lat))
    })
    expect(surface.maxDensity).toBe(computeMaxDensity(surface.points))
  })

  it("computes a default bandwidth when none is given or it isn't positive", () => {
    expect(computeHotSpotSurface(latLongs)!.bandwidthMeters).toBe(computeDefaultBandwidth(latLongs))
    expect(computeHotSpotSurface(latLongs, 0)!.bandwidthMeters).toBe(computeDefaultBandwidth(latLongs))
  })
})
