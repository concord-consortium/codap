import { Map as LeafletMap, Point, Projection } from "leaflet"
import { greatCircleDistance } from "../../../utilities/geo-utils"
import {
  bandwidthToWorldUnits, buildColorLUT, colorizeDensityGrid, computeDefaultBandwidth, computeDensityGrid,
  computeHotSpotSurface, computeMaxDensity, hotSpotFade, IDensityGridRegion, IKernel, kColorLUTSize, kernelWeight,
  kFallbackBandwidthMeters, kHotSpotFadeFloor, kHotSpotFadeFull, kMaxMercatorLatitude, kWebMercatorRadiusMeters,
  kWorldSize, latLongToWorldPoint, projectHotSpotKernels, renderHotSpotSurface, wrapWorldDelta
} from "./hot-spot-utils"
import { createLatLongProjector } from "./map-utils"

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

describe("computeDensityGrid", () => {
  // 20 × 20 cells of 2px starting at the container origin; cell (c, r) is centered at (2c + 1, 2r + 1)
  const region: IDensityGridRegion = { originX: 0, originY: 0, cols: 20, rows: 20, cellSize: 2 }
  const at = (grid: Float32Array, col: number, row: number) => grid[row * region.cols + col]
  // much wider than the region and the kernels' windows, so nothing wraps
  const wideWorld = 1000

  it("peaks at 1 on a single point and falls off symmetrically", () => {
    const grid = computeDensityGrid([{ x: 11, y: 11, h: 4 }], region, wideWorld)
    expect(at(grid, 5, 5)).toBeCloseTo(1)
    // one cell = 2px away: exp(−4 / (2·16))
    expect(at(grid, 6, 5)).toBeCloseTo(Math.exp(-4 / 32))
    expect(at(grid, 4, 5)).toBeCloseTo(at(grid, 6, 5))
    expect(at(grid, 5, 6)).toBeCloseTo(at(grid, 6, 5))
  })

  it("is zero outside the cutoff window", () => {
    const grid = computeDensityGrid([{ x: 11, y: 11, h: 1 }], region, wideWorld)
    expect(at(grid, 6, 5)).toBeGreaterThan(0)   // 2px away, within 3px
    expect(at(grid, 7, 5)).toBe(0)              // 4px away
  })

  it("matches brute-force evaluation at the cell centers", () => {
    const kernels = [{ x: 11, y: 11, h: 4 }, { x: 15.3, y: 9.7, h: 2.5 }, { x: 30, y: 31, h: 6 }]
    const grid = computeDensityGrid(kernels, region, wideWorld)
    for (let row = 0; row < region.rows; row++) {
      for (let col = 0; col < region.cols; col++) {
        const cx = 2 * col + 1, cy = 2 * row + 1
        const expected = kernels.reduce((sum, k) => sum + kernelWeight(cx - k.x, cy - k.y, k.h), 0)
        expect(at(grid, col, row)).toBeCloseTo(expected, 5)
      }
    }
  })

  it("includes points just outside the region", () => {
    const grid = computeDensityGrid([{ x: -3, y: 11, h: 4 }], region, wideWorld)
    // cell (0, 5) is centered 4px from the point
    expect(at(grid, 0, 5)).toBeCloseTo(Math.exp(-16 / 32))
  })

  it("respects the region's origin", () => {
    const shifted = { ...region, originX: -40, originY: -30 }
    const grid = computeDensityGrid([{ x: -29, y: -19, h: 4 }], shifted, wideWorld)
    expect(at(grid, 5, 5)).toBeCloseTo(1)
  })

  describe("around a world as wide as the region", () => {
    const worldWidth = 40
    const wrap = (dx: number) => dx - worldWidth * Math.round(dx / worldWidth)

    it("wraps horizontal distances around the world", () => {
      const grid = computeDensityGrid([{ x: 1, y: 11, h: 2 }], region, worldWidth)
      // cell 19 is centered at 39, 38px away within this copy but 2px away across the seam
      expect(at(grid, 19, 5)).toBeCloseTo(Math.exp(-4 / 8))
      expect(at(grid, 0, 5)).toBeCloseTo(1)
    })

    it("matches brute-force evaluation with wrapped distances, counting each kernel once per cell", () => {
      // the last kernel's window (3h = 24px each way) is wider than the world
      const kernels = [{ x: 2.3, y: 11, h: 3 }, { x: 37.7, y: 20.4, h: 2.5 }, { x: 19.1, y: 30, h: 8 }]
      const grid = computeDensityGrid(kernels, region, worldWidth)
      for (let row = 0; row < region.rows; row++) {
        for (let col = 0; col < region.cols; col++) {
          const cx = 2 * col + 1, cy = 2 * row + 1
          const expected = kernels.reduce((sum, k) => sum + kernelWeight(wrap(cx - k.x), cy - k.y, k.h), 0)
          expect(at(grid, col, row)).toBeCloseTo(expected, 5)
        }
      }
    })

    it("draws a kernel in each world copy that the region shows", () => {
      const wide = { ...region, cols: 60 }   // three worlds wide
      const grid = computeDensityGrid([{ x: 11, y: 11, h: 2 }], wide, worldWidth)
      const atWide = (col: number, row: number) => grid[row * wide.cols + col]
      expect(atWide(5, 5)).toBeCloseTo(1)
      expect(atWide(25, 5)).toBeCloseTo(1)
      expect(atWide(45, 5)).toBeCloseTo(1)
    })
  })
})

describe("hotSpotFade", () => {
  it("is 0 at or below the floor", () => {
    expect(hotSpotFade(0)).toBe(0)
    expect(hotSpotFade(kHotSpotFadeFloor - 0.001)).toBe(0)
    expect(hotSpotFade(kHotSpotFadeFloor)).toBe(0)
  })

  it("is 1 at or above the full cutoff", () => {
    expect(hotSpotFade(kHotSpotFadeFull)).toBe(1)
    expect(hotSpotFade(kHotSpotFadeFull + 0.001)).toBe(1)
    expect(hotSpotFade(1)).toBe(1)
  })

  it("is 0.5 halfway between the cutoffs", () => {
    expect(hotSpotFade((kHotSpotFadeFloor + kHotSpotFadeFull) / 2)).toBeCloseTo(0.5, 10)
  })

  it("follows smoothstep between the cutoffs", () => {
    const x = 0.25
    const density = kHotSpotFadeFloor + x * (kHotSpotFadeFull - kHotSpotFadeFloor)
    expect(hotSpotFade(density)).toBeCloseTo(x * x * (3 - 2 * x), 10)
  })

  it("never decreases", () => {
    let previous = 0
    for (let i = 0; i <= 1000; i++) {
      const fade = hotSpotFade(i / 1000)
      expect(fade).toBeGreaterThanOrEqual(previous)
      previous = fade
    }
  })
})

describe("buildColorLUT", () => {
  const rgbaAt = (lut: Uint8ClampedArray, i: number) => Array.from(lut.slice(i * 4, i * 4 + 4))
  // the first LUT index at or above the full cutoff
  const fullIndex = Math.ceil(kHotSpotFadeFull * (kColorLUTSize - 1))

  it("runs from the low color to the high color", () => {
    const lut = buildColorLUT("#000000", "#ffffff")
    expect(lut.length).toBe(kColorLUTSize * 4)
    expect(rgbaAt(lut, 0)).toEqual([0, 0, 0, 0])
    expect(rgbaAt(lut, 128)).toEqual([128, 128, 128, 255])
    expect(rgbaAt(lut, 255)).toEqual([255, 255, 255, 255])
  })

  it("fades low densities to transparent", () => {
    const lut = buildColorLUT("#000000", "#ffffff")
    const alphaAt = (i: number) => lut[i * 4 + 3]
    const floorIndex = Math.floor(kHotSpotFadeFloor * (kColorLUTSize - 1))
    for (let i = 0; i <= floorIndex; i++) {
      expect(alphaAt(i)).toBe(0)
    }
    const midIndex = 30
    expect(alphaAt(midIndex)).toBe(Math.round(255 * hotSpotFade(midIndex / (kColorLUTSize - 1))))
    expect(alphaAt(midIndex)).toBeGreaterThan(0)
    expect(alphaAt(midIndex)).toBeLessThan(255)
    for (let i = fullIndex; i < kColorLUTSize; i++) {
      expect(alphaAt(i)).toBe(255)
    }
  })

  it("multiplies the gradient's alpha by the fade", () => {
    const lut = buildColorLUT("#ff000000", "#ff0000ff")
    expect(rgbaAt(lut, 0)).toEqual([255, 0, 0, 0])
    expect(rgbaAt(lut, 255)).toEqual([255, 0, 0, 255])
    // above the full cutoff, only the gradient's alpha applies
    expect(lut[fullIndex * 4 + 3]).toBe(Math.round(fullIndex))
    // within the fade, both apply
    const midIndex = 30
    expect(lut[midIndex * 4 + 3]).toBe(Math.round(midIndex * hotSpotFade(midIndex / (kColorLUTSize - 1))))
  })
})

describe("colorizeDensityGrid", () => {
  const lut = buildColorLUT("#000000", "#ffffff")

  it("maps 0 to the transparent low color, the maximum to the high color, and clamps above it", () => {
    const out = new Uint8ClampedArray(4 * 4)
    colorizeDensityGrid(Float32Array.of(0, 1, 2, 4), 2, lut, out)
    expect(Array.from(out)).toEqual([
      0, 0, 0, 0,
      128, 128, 128, 255,
      255, 255, 255, 255,
      255, 255, 255, 255
    ])
  })

  it("is transparent everywhere when the maximum is 0", () => {
    const out = new Uint8ClampedArray(4)
    colorizeDensityGrid(Float32Array.of(0), 0, lut, out)
    expect(Array.from(out)).toEqual([0, 0, 0, 0])
  })
})

describe("rendering a surface", () => {
  function createMap(center: [number, number], zoom: number) {
    const container = document.createElement("div")
    Object.defineProperty(container, "clientWidth", { value: 400 })
    Object.defineProperty(container, "clientHeight", { value: 300 })
    document.body.appendChild(container)
    return new LeafletMap(container, { center, zoom })
  }
  const zoomScale = (map: LeafletMap) => map.getZoomScale(map.getZoom(), 0)
  const surface = computeHotSpotSurface([{ lat: 40, long: -100 }, { lat: 40.3, long: -100.2 }], 50000)!

  it("gives the same density at a location at every zoom level", () => {
    const target = { lat: 40.2, long: -100.1 }
    const densities = [6, 8].map(zoom => {
      const map = createMap([40, -100], zoom)
      const project = createLatLongProjector(map)
      const { x, y } = project(target)
      // a single cell centered on the target
      const region = { originX: x - 1, originY: y - 1, cols: 1, rows: 1, cellSize: 2 }
      const kernels = projectHotSpotKernels(surface, project, zoomScale(map))
      const density = computeDensityGrid(kernels, region, kWorldSize * zoomScale(map))[0]
      map.remove()
      return density
    })
    expect(densities[0]).toBeGreaterThan(0)
    // Leaflet rounds projected points to whole pixels, which shifts each kernel by up to half a pixel
    expect(densities[0]).toBeCloseTo(densities[1], 2)
  })

  it("renders one RGBA pixel per cell", () => {
    const map = createMap([40, -100], 6)
    const region = { originX: -40, originY: -30, cols: 240, rows: 180, cellSize: 2 }
    const out = new Uint8ClampedArray(region.cols * region.rows * 4)
    renderHotSpotSurface(surface, createLatLongProjector(map), zoomScale(map), region,
      buildColorLUT("#000000", "#ffffff"), out)
    // far corner: no density, so transparent
    expect(Array.from(out.slice(0, 4))).toEqual([0, 0, 0, 0])
    // some cell near the points is bright
    expect(Math.max(...out.filter((_, i) => i % 4 === 0))).toBeGreaterThan(200)
    map.remove()
  })

  it("gives the same brightness near the antimeridian wherever the map is panned", () => {
    // one world unit apart across the antimeridian, with a bandwidth of one world unit
    const bandwidth = 2 * Math.PI * kWebMercatorRadiusMeters / kWorldSize
    const east = { lat: 0, long: 179.296875 }
    const seamSurface = computeHotSpotSurface([east, { lat: 0, long: -179.296875 }], bandwidth)!
    const lut = buildColorLUT("#000000", "#ffffff")
    // centered on 0°, the points project to opposite sides of the map; centered on 180°, next to each other
    const brightnesses = [0, 180].map(centerLong => {
      const map = createMap([0, centerLong], 1)
      const project = createLatLongProjector(map)
      const { x, y } = project(east)
      // a single cell centered on the eastern point
      const region = { originX: x - 1, originY: y - 1, cols: 1, rows: 1, cellSize: 2 }
      const out = new Uint8ClampedArray(4)
      renderHotSpotSurface(seamSurface, project, zoomScale(map), region, lut, out)
      map.remove()
      return out[0]
    })
    // the density there is 1 + e^(−½), against a maximum of 2e^(−⅛) between the points
    const expected = 255 * (1 + Math.exp(-0.5)) / (2 * Math.exp(-0.125))
    // Leaflet rounds projected points to whole pixels
    brightnesses.forEach(brightness => expect(Math.abs(brightness - expected)).toBeLessThanOrEqual(2))
  })
})
