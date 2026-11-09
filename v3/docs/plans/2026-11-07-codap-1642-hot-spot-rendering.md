# CODAP-1642 Phases 1–4: Hot Spot Rendering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder rectangle in `MapHotSpotLayer` with a kernel density surface computed from the
point layer's visible points, drawn as a continuous low-color → high-color canvas over the map.

**Architecture:** Follows the design doc,
[2026-11-06-codap-1642-kde-hot-spots-design.md](2026-11-06-codap-1642-kde-hot-spots-design.md) (§ numbers below
refer to it). Builds on the Phase 0 refactors
([2026-11-07-codap-1642-phase-0-refactors.md](2026-11-07-codap-1642-phase-0-refactors.md)). The math is pure
functions in a new `hot-spot-utils.ts`, all tested first. The zoom-independent part (points, bandwidth, maximum
density) is a cached MobX view on `MapPointLayerModel`. A small Leaflet layer, `HotSpotCanvasLayer`, owns the
canvas and its positioning. `MapHotSpotLayer` connects the two.

**Tech Stack:** TypeScript, MobX / MobX-State-Tree, Leaflet, colord, Jest (with `jest-canvas-mock`), Cypress.

---

## Conventions for this plan

- All `npm` commands run from `v3/`. All `git` commands run from the repo root (`v3/`'s parent).
- **Commits:** per CLAUDE.md, show the proposed commit message to the user and get explicit approval before every
  commit. The messages below are proposals. End each with the `Co-Authored-By` line from the session's
  attribution instructions.
- After each task: `npm run lint` and `npm run build:tsc` must be clean.
- New source paths are relative to `v3/src/`. The main new file is `components/map/utilities/hot-spot-utils.ts`,
  built up over Tasks 3–8. Its imports are listed once, in Task 3. Add each later import when a task first needs
  it.

## Deviations from the design doc

1. **Where the data cache lives (§8).** The design puts the zoom-independent cache (points, bandwidth, maximum
   density) in the `MapHotSpotLayer` component. This plan makes it a computed view, `MapPointLayerModel.
   hotSpotSurface`, instead. MobX caches it while something observes it, recomputes it when `pointDataVersion` or
   `bandwidth` changes, and it can be tested without React or Leaflet. The component observes it only while hot
   spots are shown, so nothing is computed when they are off.
2. **Kernel truncation shape (§1, §6).** The design drops terms with `|x − p| > 3h`, a circle. The separable grid
   accumulation naturally covers a square window, `|dx| ≤ 3h` and `|dy| ≤ 3h`. To keep the grid and the max
   computation exactly consistent, both use the square window, via a shared `kernelWeight`. The corners add at
   most `exp(−4.5) ≈ 0.011` per point, which has no visible effect.
3. **The outlier test (Testing section) is dropped because its claim is wrong.** The design says an outlier
   "barely changes the result (the median term wins)". The outlier also moves the *mean center*, which increases
   every point's distance, including the median. A 3 × 3 cluster plus one point on another continent gives a
   bandwidth 27× larger (6.6 km → 179 km). Task 4 instead tests directly that the median term is used when it is
   smaller. This matches ArcGIS's formula. Robustness to outliers would need a different center (e.g. the median
   center), which can be a later story if the default proves poor.
4. **Phase 5 (performance) is not in this plan,** per resolved decision 2. Task 11 records timings for a large
   dataset so the follow-up story starts with numbers.
5. **Known limitation, also deferred:** when the map is zoomed out far enough that a kernel is narrower than a
   grid cell (`h · 2^zoom < kHotSpotCellSize`), sampling at cell centers can miss it. With the default
   bandwidth this happens only when the data covers a small part of the visible map. If it matters, a fix belongs
   with the Phase 5 binning fallback.

Task 0 updates the design doc to match items 1–3.

---

## Task 0: Update the design doc

**Files:**
- Modify: `v3/docs/plans/2026-11-06-codap-1642-kde-hot-spots-design.md`

**Step 1: Make the edits**

- §1: change "(terms with `|x − pᵢ| > kKernelCutoff · hᵢ` are dropped)" to say terms are dropped outside the
  square window `|dx|, |dy| ≤ kKernelCutoff · hᵢ`, and give the reason (it matches the separable grid exactly).
- §2: replace "No setters are added yet" with: setters exist for every property (`setBandwidth`, `setOpacity`,
  `setLowColor`, `setHighColor`), though the UI doesn't call them yet.
- §8 "Data-dependent cache": say it is the `MapPointLayerModel.hotSpotSurface` computed view, observed by
  `MapHotSpotLayer` while shown.
- Testing, `computeDefaultBandwidth`: replace the outlier bullet with "the median term is used when it is
  smaller than SD". Add a sentence noting that a far outlier moves the mean center and so does inflate the
  bandwidth.

**Step 2: Commit** (docs only)

```
Update hot spot design: square kernel window, surface view, outlier note (CODAP-1642)
```

---

## Phase 1: Model

## Task 1: Add the hot spot display properties

**Files:**
- Modify: `components/map/models/map-hot-spot-model.ts`
- Modify: `components/map/models/map-hot-spot-model.test.ts`
- Modify: `v2/codap-v2-types.ts:542-546`
- Modify: `components/map/v2-map-importer.test.ts:240-271`

**Step 1: Write the failing tests**

Add `isDefaultHotSpotModel` to the import in `map-hot-spot-model.test.ts`, then add inside the `describe`:

```ts
  it("has defaults for the density display", () => {
    const hotSpot = MapHotSpotModel.create()
    expect(hotSpot.bandwidth).toBeUndefined()
    expect(hotSpot.opacity).toBe(0.75)
    expect(hotSpot.lowColor).toBe("#000000")
    expect(hotSpot.highColor).toBe("#ffffff")
    expect(isDefaultHotSpotModel(hotSpot)).toBe(true)
  })

  it("is not default when a display property differs", () => {
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ bandwidth: 5000 }))).toBe(false)
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ highColor: "#ff0000" }))).toBe(false)
  })

  it("can set the display properties", () => {
    const hotSpot = MapHotSpotModel.create()
    hotSpot.setBandwidth(5000)
    hotSpot.setOpacity(0.5)
    hotSpot.setLowColor("#0000ff")
    hotSpot.setHighColor("#ff0000")
    expect(getSnapshot(hotSpot)).toEqual(
      { isVisible: false, bandwidth: 5000, opacity: 0.5, lowColor: "#0000ff", highColor: "#ff0000" })
    hotSpot.setBandwidth(undefined)
    expect(hotSpot.bandwidth).toBeUndefined()
  })
```

In `v2-map-importer.test.ts`, in the `"V2 map hot spot round-trip"` describe, add:

```ts
  it("round-trips non-default display properties", () => {
    const { v2Document } = loadCodapDocument("roller-coasters-map-layer-formats.codap")
    const v2MapTile = v2Document.components.find(c => c.type === "DG.MapView")!
    const layerModels = (v2MapTile.componentStorage as any).mapModelStorage.layerModels
    const v2PointLayer = layerModels.find((l: any) => l.pointColor != null)
    const hotSpot = { isVisible: true, bandwidth: 5000, opacity: 0.5, lowColor: "#0000ff", highColor: "#ff0000" }
    v2PointLayer.v3 = { ...v2PointLayer.v3, hotSpot }

    const tile = v2MapImporter({ v2Component: v2MapTile, v2Document, ...mockImporterArgs })
    const content = isMapContentModel(tile?.content) ? tile.content : undefined
    const layer = content!.layers.find((l: any) => l.type === "mapPointLayer")! as any
    expect(getSnapshot(layer.hotSpotModel)).toEqual(hotSpot)

    const out = v2MapExporter({ tile: tile! })
    const exportedLayers = (out!.componentStorage as any).mapModelStorage.layerModels
    expect(exportedLayers.find((l: any) => l.v3?.hotSpot)?.v3?.hotSpot).toEqual(hotSpot)
  })
```

Add `import { getSnapshot } from "mobx-state-tree"` if the file doesn't already have it.

Run: `npm test -- map-hot-spot-model v2-map-importer`
Expected: FAIL. The new properties and setters don't exist.

**Step 2: Implement**

`map-hot-spot-model.ts`:

```ts
export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false,
  // Kernel bandwidth in meters on the ground; undefined means compute a default from the data's spread
  bandwidth: types.maybe(types.number),
  opacity: 0.75,
  lowColor: "#000000",
  highColor: "#ffffff"
})
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    },
    // undefined restores the default bandwidth computed from the data
    setBandwidth(bandwidth: Maybe<number>) {
      self.bandwidth = bandwidth
    },
    setOpacity(opacity: number) {
      self.opacity = opacity
    },
    setLowColor(color: string) {
      self.lowColor = color
    },
    setHighColor(color: string) {
      self.highColor = color
    }
  }))
  .actions(applyModelChange)
```

Nothing in the UI calls the new setters yet. The UI story will.

`codap-v2-types.ts`, `ICodapV2MapHotSpotStorage`:

```ts
export interface ICodapV2MapHotSpotStorage {
  isVisible?: boolean
  bandwidth?: number
  opacity?: number
  lowColor?: string
  highColor?: string
}
```

**Step 3: Fix the existing export test**

The exporter writes the whole snapshot, so `"exports a visible hot spot under the point layer's v3 namespace"`
now gets the defaults too. Change its expectation to:

```ts
    expect(exportedLayer?.v3?.hotSpot).toEqual({ ...kDefaultHotSpotSnapshot, isVisible: true })
```

and import `kDefaultHotSpotSnapshot` from `"./models/map-hot-spot-model"`. The import test (`{ isVisible: true }`
only) should pass unchanged. It shows that documents saved before this change still load, with the new
properties at their defaults.

Run: `npm test -- map-hot-spot-model v2-map-importer`
Expected: PASS.

**Step 4: Commit**

```
Add bandwidth, opacity, and color properties to MapHotSpotModel (CODAP-1642)
```

---

## Phase 2: Math utilities (TDD)

## Task 2: Mean center in `geo-utils.ts`

**Files:**
- Modify: `utilities/math-utils.ts`, `utilities/math-utils.test.ts`
- Modify: `utilities/geo-utils.ts`, `utilities/geo-utils.test.ts`

**Step 1: Write the failing tests**

`math-utils.test.ts` (add `radiansToDegrees` to the import):

```ts
describe("radiansToDegrees", () => {
  it("converts radians to degrees", () => {
    expect(radiansToDegrees(0)).toBe(0)
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180)
    expect(radiansToDegrees(-Math.PI / 2)).toBeCloseTo(-90)
  })
})
```

`geo-utils.test.ts` (add `computeMeanCenter` to the import):

```ts
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
```

Run: `npm test -- math-utils geo-utils`
Expected: FAIL. The functions don't exist.

**Step 2: Implement**

`math-utils.ts`, next to `degreesToRadians`:

```ts
export function radiansToDegrees(radians: number) {
  return radians * 180 / Math.PI
}
```

`geo-utils.ts` (import `ILatLong` from `"../components/map/map-types"` and `radiansToDegrees`):

```ts
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
  return { lat: radiansToDegrees(Math.atan2(z, Math.hypot(x, y))), long: radiansToDegrees(Math.atan2(y, x)) }
}
```

(The sums don't need dividing by `n`, because `atan2` only uses their ratios.)

Run: `npm test -- math-utils geo-utils`
Expected: PASS.

**Step 3: Commit**

```
Add radiansToDegrees and computeMeanCenter (CODAP-1642)
```

## Task 3: Constants and world-coordinate conversions

**Files:**
- Create: `components/map/utilities/hot-spot-utils.ts`
- Create: `components/map/utilities/hot-spot-utils.test.ts`

**Step 1: Write the failing tests**

```ts
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
```

Run: `npm test -- hot-spot-utils`
Expected: FAIL. The module doesn't exist.

**Step 2: Implement**

`hot-spot-utils.ts` (the complete import list for Tasks 3–8 is below; add each import when first used):

```ts
import { CRS, latLng, Point } from "leaflet"
import { interpolateRgba } from "../../../utilities/color-utils"
import { computeMeanCenter, greatCircleDistance } from "../../../utilities/geo-utils"
import { degreesToRadians, quantileOfSortedArray } from "../../../utilities/math-utils"
import { ILatLong } from "../map-types"
import { LatLongProjector } from "./map-utils"

/** Grid cell side length, in CSS pixels */
export const kHotSpotCellSize = 2
/** Kernels are truncated outside a square window of this many bandwidths in each direction */
export const kKernelCutoff = 3
/** Extra canvas margin around the viewport, as a fraction of each dimension, on each side */
export const kHotSpotPadding = 0.1
/** Bandwidth used when the points have no spread */
export const kFallbackBandwidthMeters = 10000
/** Radius of the sphere used by Leaflet's Web Mercator projection (EPSG:3857) */
export const kWebMercatorRadiusMeters = 6378137
/** Leaflet's Web Mercator latitude limit */
export const kMaxMercatorLatitude = 85.0511287798
/** Width and height of the world in Leaflet's zoom-0 pixel coordinates */
export const kWorldSize = 256

/** Projects a lat/long to Leaflet's zoom-0 world coordinates, in which the world is a 256 × 256 square. */
export function latLongToWorldPoint({ lat, long }: ILatLong): Point {
  return CRS.EPSG3857.latLngToPoint(latLng(lat, long), 0)
}

/**
 * Converts a distance on the ground near the given latitude to zoom-0 world units. Mercator stretches the map by
 * 1/cos(latitude), so a kernel of this many world units covers about bandwidthMeters on the ground.
 */
export function bandwidthToWorldUnits(bandwidthMeters: number, lat: number) {
  const clampedLat = Math.max(-kMaxMercatorLatitude, Math.min(kMaxMercatorLatitude, lat))
  const metersPerWorldUnit =
    2 * Math.PI * kWebMercatorRadiusMeters * Math.cos(degreesToRadians(clampedLat)) / kWorldSize
  return bandwidthMeters / metersPerWorldUnit
}
```

Run: `npm test -- hot-spot-utils`
Expected: PASS.

**Step 3: Commit**

```
Add hot spot constants and world-coordinate conversions (CODAP-1642)
```

## Task 4: Default bandwidth

**Files:**
- Modify: `components/map/utilities/hot-spot-utils.ts`, `hot-spot-utils.test.ts`

**Step 1: Write the failing tests**

Add `computeDefaultBandwidth` and `kFallbackBandwidthMeters` to the test's import, and import
`greatCircleDistance` from `"../../../utilities/geo-utils"`.

```ts
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
```

The expected values were checked against a standalone prototype of the formula. For example, the first test
gives 65593.016 m, and the two antimeridian clusters agree to within 1e-9 m.

Run: `npm test -- hot-spot-utils`
Expected: FAIL.

**Step 2: Implement**

```ts
// Spreads smaller than this are floating-point error from coincident points
const kMinSpreadMeters = 0.001

/**
 * Returns the default bandwidth in meters, using the default search radius of ArcGIS's Kernel Density tool:
 * 0.9 · min(SD, √(1/ln 2) · Dm) · n^(−0.2), where SD is the standard distance of the points from their mean center
 * and Dm is their median distance from it.
 */
export function computeDefaultBandwidth(latLongs: ILatLong[]) {
  const center = computeMeanCenter(latLongs)
  if (!center) return kFallbackBandwidthMeters

  const distances = latLongs.map(({ lat, long }) => greatCircleDistance(lat, long, center.lat, center.long))
  const n = distances.length
  const standardDistance = Math.sqrt(distances.reduce((sum, d) => sum + d * d, 0) / n)
  if (standardDistance < kMinSpreadMeters) return kFallbackBandwidthMeters

  const medianDistance = quantileOfSortedArray([...distances].sort((a, b) => a - b), 0.5) ?? 0
  // When more than half of the points are at the mean center, the median is zero, so use SD alone
  const spread = medianDistance < kMinSpreadMeters
    ? standardDistance
    : Math.min(standardDistance, Math.sqrt(1 / Math.LN2) * medianDistance)
  return 0.9 * spread * n ** -0.2
}
```

Run: `npm test -- hot-spot-utils`
Expected: PASS.

**Step 3: Commit**

```
Add default hot spot bandwidth from the points' spread (CODAP-1642)
```

## Task 5: Maximum density (mean-shift)

**Files:**
- Modify: `components/map/utilities/hot-spot-utils.ts`, `hot-spot-utils.test.ts`

**Step 1: Write the failing tests**

Add `computeMaxDensity`, `IKernel`, `kernelWeight`, and `wrapWorldDelta` to the test's import.

```ts
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
```

The two-point, antimeridian, and brute-force expectations were checked against a standalone prototype of the
algorithm below (two points: 1.21298 vs. 1.21306 exact; cluster: 2.25415 vs. 2.25414 brute force).

Run: `npm test -- hot-spot-utils`
Expected: FAIL.

**Step 2: Implement**

```ts
/** A Gaussian kernel centered at (x, y) with bandwidth h, all in the same units */
export interface IKernel {
  x: number
  y: number
  h: number
}

/** Unnormalized Gaussian kernel, truncated outside a square window of half-width kKernelCutoff · h */
export function kernelWeight(dx: number, dy: number, h: number) {
  const r = kKernelCutoff * h
  if (Math.abs(dx) > r || Math.abs(dy) > r) return 0
  return Math.exp(-(dx * dx + dy * dy) / (2 * h * h))
}

/** Wraps a horizontal world-coordinate difference into [−128, 128], the short way across the antimeridian */
export function wrapWorldDelta(dx: number) {
  return dx - kWorldSize * Math.round(dx / kWorldSize)
}

const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Buckets world-coordinate kernels so that every kernel whose window contains a location is in that location's
 * bucket or one of its eight neighbors. Buckets are at least kKernelCutoff · (largest h) wide. Columns wrap
 * around the antimeridian.
 */
class WorldKernelIndex {
  private size: number
  private buckets = new Map<number, IKernel[]>()

  constructor(kernels: IKernel[]) {
    const maxH = kernels.reduce((max, { h }) => Math.max(max, h), 0)
    this.size = Math.max(1, Math.floor(kWorldSize / (kKernelCutoff * maxH)))
    kernels.forEach(kernel => {
      const key = this.key(this.col(kernel.x), this.row(kernel.y))
      const bucket = this.buckets.get(key)
      if (bucket) {
        bucket.push(kernel)
      } else {
        this.buckets.set(key, [kernel])
      }
    })
  }

  private col(x: number) {
    return Math.floor(mod(x, kWorldSize) / kWorldSize * this.size) % this.size
  }

  private row(y: number) {
    return Math.min(this.size - 1, Math.max(0, Math.floor(y / kWorldSize * this.size)))
  }

  private key(col: number, row: number) {
    return row * this.size + col
  }

  /** Calls fn with each kernel that may be within kKernelCutoff bandwidths of (x, y), and its offset from it */
  forEachNear(x: number, y: number, fn: (kernel: IKernel, dx: number, dy: number) => void) {
    const col = this.col(x), row = this.row(y)
    const cols = new Set([col - 1, col, col + 1].map(c => mod(c, this.size)))
    for (let r = Math.max(0, row - 1); r <= Math.min(this.size - 1, row + 1); r++) {
      cols.forEach(c => {
        this.buckets.get(this.key(c, r))?.forEach(kernel => fn(kernel, wrapWorldDelta(kernel.x - x), kernel.y - y))
      })
    }
  }

  densityAt(x: number, y: number) {
    let density = 0
    this.forEachNear(x, y, (kernel, dx, dy) => { density += kernelWeight(dx, dy, kernel.h) })
    return density
  }
}

const kMaxMeanShiftIterations = 50
// Mean-shift stops when a step is smaller than this fraction of the starting point's bandwidth
const kMeanShiftTolerance = 1e-6

/**
 * Returns the maximum of the density surface of world-coordinate kernels. The maximum usually lies between
 * points, so this climbs from each point to its local maximum with mean-shift, which always moves uphill on a
 * sum of Gaussians. The density at each starting point is included too, so the result is never less than
 * evaluating at the points alone.
 */
export function computeMaxDensity(kernels: IKernel[]) {
  const index = new WorldKernelIndex(kernels)
  let maxDensity = 0
  kernels.forEach(start => {
    let { x, y } = start
    maxDensity = Math.max(maxDensity, index.densityAt(x, y))
    for (let i = 0; i < kMaxMeanShiftIterations; i++) {
      let sumWeights = 0, sumDx = 0, sumDy = 0
      index.forEachNear(x, y, (kernel, dx, dy) => {
        // the gradient of the density is Σ kernelWeight · (offset) / h², so this step always goes uphill
        const weight = kernelWeight(dx, dy, kernel.h) / (kernel.h * kernel.h)
        sumWeights += weight
        sumDx += weight * dx
        sumDy += weight * dy
      })
      if (sumWeights === 0) break
      const stepX = sumDx / sumWeights, stepY = sumDy / sumWeights
      x += stepX
      y += stepY
      if (Math.hypot(stepX, stepY) < kMeanShiftTolerance * start.h) break
    }
    maxDensity = Math.max(maxDensity, index.densityAt(x, y))
  })
  return maxDensity
}
```

Run: `npm test -- hot-spot-utils`
Expected: PASS.

**Step 3: Commit**

```
Add mean-shift maximum density for hot spots (CODAP-1642)
```

## Task 6: The hot spot surface and `MapPointLayerModel.hotSpotSurface`

**Files:**
- Modify: `components/map/utilities/hot-spot-utils.ts`, `hot-spot-utils.test.ts`
- Modify: `components/map/models/map-point-layer-model.ts`
- Modify: `components/map/models/map-point-layer-model.test.ts`

**Step 1: Write the failing tests**

`hot-spot-utils.test.ts` (add `computeHotSpotSurface` to the import):

```ts
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
```

`map-point-layer-model.test.ts` (add imports: `reaction` from `"mobx"`, `IHotSpotSurface` and `kFallbackBandwidthMeters` from
`"../utilities/hot-spot-utils"`):

```ts
describe("MapPointLayerModel.hotSpotSurface", () => {
  it("is undefined without plotted points", () => {
    expect(MapPointLayerModel.create().hotSpotSurface).toBeUndefined()
  })

  it("uses the plotted cases", () => {
    const tree = createPointLayerTree()
    const surface = tree.layer.hotSpotSurface!
    // c3 has no latitude; c1 and c2 coincide, so there's no spread and the fallback bandwidth applies
    expect(surface.points.map(p => p.latLong)).toEqual([{ lat: 42, long: -71 }, { lat: 42, long: -71 }])
    expect(surface.bandwidthMeters).toBe(kFallbackBandwidthMeters)
    expect(surface.maxDensity).toBeCloseTo(2)
  })

  it("excludes hidden cases", () => {
    const tree = createPointLayerTree()
    const { caseID } = tree.layer.dataConfiguration.getCaseDataArray(0)[0]
    tree.layer.dataConfiguration.addNewHiddenCases([caseID])
    expect(tree.layer.hotSpotSurface!.points).toHaveLength(1)
  })

  it("uses the hot spot model's bandwidth when it is set", () => {
    const tree = createPointLayerTree()
    tree.layer.hotSpotModel.setBandwidth(5000)
    expect(tree.layer.hotSpotSurface!.bandwidthMeters).toBe(5000)
  })

  it("recomputes when a coordinate changes", () => {
    const tree = createPointLayerTree()
    const surfaces: Array<Maybe<IHotSpotSurface>> = []
    const dispose = reaction(() => tree.layer.hotSpotSurface, surface => surfaces.push(surface))
    tree.data.setCaseValues([{ __id__: "c2", latId: -30, longId: 120 }])
    expect(surfaces).toHaveLength(1)
    // the two points are now far apart
    expect(surfaces[0]!.maxDensity).toBeCloseTo(1)
    dispose()
  })
})
```

Run: `npm test -- hot-spot-utils map-point-layer-model`
Expected: FAIL.

**Step 2: Implement**

`hot-spot-utils.ts`:

```ts
/** A point to plot, with its position and bandwidth in zoom-0 world units */
export interface IHotSpotPoint extends IKernel {
  latLong: ILatLong
}

/** Everything about a density surface that doesn't depend on the map's view */
export interface IHotSpotSurface {
  points: IHotSpotPoint[]
  bandwidthMeters: number
  maxDensity: number
}

/**
 * Returns the density surface of the points, or undefined if there are none. If bandwidthMeters isn't a positive
 * number, a default is computed from the points' spread.
 */
export function computeHotSpotSurface(latLongs: ILatLong[], bandwidthMeters?: number): Maybe<IHotSpotSurface> {
  if (!latLongs.length) return
  const bandwidth = bandwidthMeters && bandwidthMeters > 0 ? bandwidthMeters : computeDefaultBandwidth(latLongs)
  const points = latLongs.map(latLong => {
    const { x, y } = latLongToWorldPoint(latLong)
    return { latLong, x, y, h: bandwidthToWorldUnits(bandwidth, latLong.lat) }
  })
  return { points, bandwidthMeters: bandwidth, maxDensity: computeMaxDensity(points) }
}
```

`map-point-layer-model.ts`: import `ILatLong` from `"../map-types"` and `computeHotSpotSurface`,
`IHotSpotSurface` from `"../utilities/hot-spot-utils"`. After the last `.views` block (the one that defines
`getCaseLatLong`), add a new `.views` block so the getter can call `self.getCaseLatLong`:

```ts
  .views(self => ({
    /**
     * The hot spots' density surface.
     */
    get hotSpotSurface(): Maybe<IHotSpotSurface> {
      // pointDataVersion signals coordinate changes that the reads below may not observe
      void self.pointDataVersion
      const latLongs: ILatLong[] = []
      self.dataConfiguration.getCaseDataArray(0).forEach(({ caseID }) => {
        const latLong = self.getCaseLatLong(caseID)
        if (latLong) latLongs.push(latLong)
      })
      return computeHotSpotSurface(latLongs, self.hotSpotModel.bandwidth)
    }
  }))
```

Run: `npm test -- hot-spot-utils map-point-layer-model`
Expected: PASS.

**Step 3: Commit**

```
Add the hot spot density surface as a MapPointLayerModel view (CODAP-1642)
```

## Task 7: The density grid

**Files:**
- Modify: `components/map/utilities/hot-spot-utils.ts`, `hot-spot-utils.test.ts`

**Step 1: Write the failing tests**

Add `computeDensityGrid` and `IDensityGridRegion` to the test's import.

```ts
describe("computeDensityGrid", () => {
  // 20 × 20 cells of 2px starting at the container origin; cell (c, r) is centered at (2c + 1, 2r + 1)
  const region: IDensityGridRegion = { originX: 0, originY: 0, cols: 20, rows: 20, cellSize: 2 }
  const at = (grid: Float32Array, col: number, row: number) => grid[row * region.cols + col]

  it("peaks at 1 on a single point and falls off symmetrically", () => {
    const grid = computeDensityGrid([{ x: 11, y: 11, h: 4 }], region)
    expect(at(grid, 5, 5)).toBeCloseTo(1)
    // one cell = 2px away: exp(−4 / (2·16))
    expect(at(grid, 6, 5)).toBeCloseTo(Math.exp(-4 / 32))
    expect(at(grid, 4, 5)).toBeCloseTo(at(grid, 6, 5))
    expect(at(grid, 5, 6)).toBeCloseTo(at(grid, 6, 5))
  })

  it("is zero outside the cutoff window", () => {
    const grid = computeDensityGrid([{ x: 11, y: 11, h: 1 }], region)
    expect(at(grid, 6, 5)).toBeGreaterThan(0)   // 2px away, within 3px
    expect(at(grid, 7, 5)).toBe(0)              // 4px away
  })

  it("matches brute-force evaluation at the cell centers", () => {
    const kernels = [{ x: 11, y: 11, h: 4 }, { x: 15.3, y: 9.7, h: 2.5 }, { x: 30, y: 31, h: 6 }]
    const grid = computeDensityGrid(kernels, region)
    for (let row = 0; row < region.rows; row++) {
      for (let col = 0; col < region.cols; col++) {
        const cx = 2 * col + 1, cy = 2 * row + 1
        const expected = kernels.reduce((sum, k) => sum + kernelWeight(cx - k.x, cy - k.y, k.h), 0)
        expect(at(grid, col, row)).toBeCloseTo(expected, 5)
      }
    }
  })

  it("includes points just outside the region", () => {
    const grid = computeDensityGrid([{ x: -3, y: 11, h: 4 }], region)
    // cell (0, 5) is centered 4px from the point
    expect(at(grid, 0, 5)).toBeCloseTo(Math.exp(-16 / 32))
  })

  it("respects the region's origin", () => {
    const shifted = { ...region, originX: -40, originY: -30 }
    const grid = computeDensityGrid([{ x: -29, y: -19, h: 4 }], shifted)
    expect(at(grid, 5, 5)).toBeCloseTo(1)
  })
})
```

Run: `npm test -- hot-spot-utils`
Expected: FAIL.

**Step 2: Implement**

```ts
/** A grid of square cells, positioned in container pixels */
export interface IDensityGridRegion {
  originX: number   // container x of the grid's left edge
  originY: number   // container y of the grid's top edge
  cols: number
  rows: number
  cellSize: number  // cell side length, in pixels
}

/**
 * Returns the density of pixel-coordinate kernels sampled at each cell's center, in row-major order. A Gaussian is
 * separable, exp(−(dx² + dy²)/2h²) = exp(−dx²/2h²) · exp(−dy²/2h²), so each kernel adds
 * rowWeight · colWeight[col] to each cell in its window and the inner loop needs no exp.
 */
export function computeDensityGrid(kernels: IKernel[], region: IDensityGridRegion) {
  const { originX, originY, cols, rows, cellSize } = region
  const grid = new Float32Array(cols * rows)
  const colWeights = new Float64Array(cols)

  // The first and last cells whose centers, origin + (i + 0.5) · cellSize, are within r of p
  const cellRange = (p: number, r: number, origin: number, count: number) => [
    Math.max(0, Math.ceil((p - r - origin) / cellSize - 0.5)),
    Math.min(count - 1, Math.floor((p + r - origin) / cellSize - 0.5))
  ]

  kernels.forEach(({ x, y, h }) => {
    const r = kKernelCutoff * h
    const [colMin, colMax] = cellRange(x, r, originX, cols)
    const [rowMin, rowMax] = cellRange(y, r, originY, rows)
    if (colMin > colMax || rowMin > rowMax) return

    const denominator = 2 * h * h
    for (let col = colMin; col <= colMax; col++) {
      const dx = originX + (col + 0.5) * cellSize - x
      colWeights[col] = Math.exp(-dx * dx / denominator)
    }
    for (let row = rowMin; row <= rowMax; row++) {
      const dy = originY + (row + 0.5) * cellSize - y
      const rowWeight = Math.exp(-dy * dy / denominator)
      const rowStart = row * cols
      for (let col = colMin; col <= colMax; col++) {
        grid[rowStart + col] += rowWeight * colWeights[col]
      }
    }
  })
  return grid
}
```

Run: `npm test -- hot-spot-utils`
Expected: PASS.

**Step 3: Commit**

```
Add separable density grid for hot spots (CODAP-1642)
```

## Task 8: Colors and rendering a surface

**Files:**
- Modify: `components/map/utilities/hot-spot-utils.ts`, `hot-spot-utils.test.ts`

**Step 1: Write the failing tests**

Add `buildColorLUT`, `colorizeDensityGrid`, `projectHotSpotKernels`, and `renderHotSpotSurface` to the test's
import. Also import `Map as LeafletMap` from `"leaflet"` and `createLatLongProjector` from `"./map-utils"`.

```ts
describe("buildColorLUT", () => {
  const rgbaAt = (lut: Uint8ClampedArray, i: number) => Array.from(lut.slice(i * 4, i * 4 + 4))

  it("runs from the low color to the high color", () => {
    const lut = buildColorLUT("#000000", "#ffffff")
    expect(lut.length).toBe(256 * 4)
    expect(rgbaAt(lut, 0)).toEqual([0, 0, 0, 255])
    expect(rgbaAt(lut, 128)).toEqual([128, 128, 128, 255])
    expect(rgbaAt(lut, 255)).toEqual([255, 255, 255, 255])
  })

  it("interpolates alpha", () => {
    const lut = buildColorLUT("#ff000000", "#ff0000ff")
    expect(rgbaAt(lut, 0)).toEqual([255, 0, 0, 0])
    expect(rgbaAt(lut, 255)).toEqual([255, 0, 0, 255])
  })
})

describe("colorizeDensityGrid", () => {
  const lut = buildColorLUT("#000000", "#ffffff")

  it("maps 0 to the low color, the maximum to the high color, and clamps above it", () => {
    const out = new Uint8ClampedArray(4 * 4)
    colorizeDensityGrid(Float32Array.of(0, 1, 2, 4), 2, lut, out)
    expect(Array.from(out)).toEqual([
      0, 0, 0, 255,
      128, 128, 128, 255,
      255, 255, 255, 255,
      255, 255, 255, 255
    ])
  })

  it("uses the low color everywhere when the maximum is 0", () => {
    const out = new Uint8ClampedArray(4)
    colorizeDensityGrid(Float32Array.of(0), 0, lut, out)
    expect(Array.from(out)).toEqual([0, 0, 0, 255])
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
      const density = computeDensityGrid(projectHotSpotKernels(surface, project, zoomScale(map)), region)[0]
      map.remove()
      return density
    })
    expect(densities[0]).toBeGreaterThan(0)
    expect(densities[0]).toBeCloseTo(densities[1], 4)
  })

  it("renders one RGBA pixel per cell", () => {
    const map = createMap([40, -100], 6)
    const region = { originX: -40, originY: -30, cols: 240, rows: 180, cellSize: 2 }
    const out = new Uint8ClampedArray(region.cols * region.rows * 4)
    renderHotSpotSurface(surface, createLatLongProjector(map), zoomScale(map), region,
      buildColorLUT("#000000", "#ffffff"), out)
    // far corner: no density, so the low color
    expect(Array.from(out.slice(0, 4))).toEqual([0, 0, 0, 255])
    // some cell near the points is bright
    expect(Math.max(...out.filter((_, i) => i % 4 === 0))).toBeGreaterThan(200)
    map.remove()
  })
})
```

Run: `npm test -- hot-spot-utils`
Expected: FAIL.

**Step 2: Implement**

```ts
const kColorLUTSize = 256

/**
 * Returns a lookup table of kColorLUTSize RGBA colors (4 bytes each) running from lowColor to highColor.
 * Future multi-stop gradients, binning, and density-based opacity all plug in here.
 */
export function buildColorLUT(lowColor: string, highColor: string) {
  const lut = new Uint8ClampedArray(kColorLUTSize * 4)
  for (let i = 0; i < kColorLUTSize; i++) {
    const { r, g, b, a } = interpolateRgba(lowColor, highColor, i / (kColorLUTSize - 1))
    lut.set([r, g, b, a * 255], i * 4)
  }
  return lut
}

/** Writes each grid cell's RGBA color to out, scaling density so 0 → the LUT's first entry and maxDensity → its last */
export function colorizeDensityGrid(
  grid: Float32Array, maxDensity: number, lut: Uint8ClampedArray, out: Uint8ClampedArray
) {
  const scale = maxDensity > 0 ? (kColorLUTSize - 1) / maxDensity : 0
  for (let i = 0; i < grid.length; i++) {
    const lutOffset = Math.min(kColorLUTSize - 1, Math.round(grid[i] * scale)) * 4
    const outOffset = i * 4
    out[outOffset] = lut[lutOffset]
    out[outOffset + 1] = lut[lutOffset + 1]
    out[outOffset + 2] = lut[lutOffset + 2]
    out[outOffset + 3] = lut[lutOffset + 3]
  }
}

/**
 * Projects the surface's points to container pixels. zoomScale (2^zoom) converts world-unit bandwidths to pixels,
 * so the density at a given location is the same at every zoom level.
 */
export function projectHotSpotKernels(
  surface: IHotSpotSurface, project: LatLongProjector, zoomScale: number
): IKernel[] {
  return surface.points.map(({ latLong, h }) => {
    const { x, y } = project(latLong)
    return { x, y, h: h * zoomScale }
  })
}

/** Renders the surface into out, one RGBA pixel per cell of the region */
export function renderHotSpotSurface(
  surface: IHotSpotSurface, project: LatLongProjector, zoomScale: number, region: IDensityGridRegion,
  lut: Uint8ClampedArray, out: Uint8ClampedArray
) {
  const grid = computeDensityGrid(projectHotSpotKernels(surface, project, zoomScale), region)
  colorizeDensityGrid(grid, surface.maxDensity, lut, out)
}
```

Run: `npm test -- hot-spot-utils`
Expected: PASS.

**Step 3: Commit**

```
Add hot spot colorization and surface rendering (CODAP-1642)
```

---

## Phase 3: Canvas layer

## Task 9: `HotSpotCanvasLayer`

**Files:**
- Create: `components/map/utilities/hot-spot-canvas-layer.ts`
- Create: `components/map/utilities/hot-spot-canvas-layer.test.ts`

The layer owns the canvas's DOM, size, and position. It knows nothing about CODAP models: whoever creates it
supplies a draw function. It mirrors Leaflet's `L.Renderer` (`node_modules/leaflet/src/layer/vector/Renderer.js`):
the canvas covers the viewport plus padding, is redrawn on `moveend`, follows drags for free because its pane moves
with the map, and is CSS-transformed during zooms.

**Step 1: Write the failing tests**

```ts
import { Map as LeafletMap } from "leaflet"
import { HotSpotCanvasLayer } from "./hot-spot-canvas-layer"

describe("HotSpotCanvasLayer", () => {
  function setup() {
    const container = document.createElement("div")
    Object.defineProperty(container, "clientWidth", { value: 400 })
    Object.defineProperty(container, "clientHeight", { value: 300 })
    document.body.appendChild(container)
    const map = new LeafletMap(container, { center: [40, -95], zoom: 4 })
    const draw = jest.fn()
    const layer = new HotSpotCanvasLayer({ pane: "overlayPane" })
    layer.setDrawFunction(draw)
    layer.addTo(map)
    // eslint-disable-next-line testing-library/no-node-access -- the canvas is created by Leaflet, not React
    const canvas = map.getPane("overlayPane")!.querySelector("canvas")!
    return { map, draw, layer, canvas }
  }

  it("adds a padded canvas with one backing pixel per cell, and draws it", () => {
    const { map, draw, canvas } = setup()
    // 400 × 300 plus 10% padding on each side is 480 × 360 CSS px, or 240 × 180 cells of 2px
    expect(canvas.width).toBe(240)
    expect(canvas.height).toBe(180)
    expect(canvas.style.width).toBe("480px")
    expect(canvas.style.height).toBe("360px")
    expect(draw).toHaveBeenCalledTimes(1)
    expect(draw).toHaveBeenCalledWith(expect.anything(),
      { originX: -40, originY: -30, cols: 240, rows: 180, cellSize: 2 })
    map.remove()
  })

  it("redraws when the map finishes moving", () => {
    const { map, draw } = setup()
    draw.mockClear()
    map.fire("moveend")
    expect(draw).toHaveBeenCalledTimes(1)
    map.remove()
  })

  it("scales the canvas during a zoom animation", () => {
    const { map, canvas } = setup()
    map.fire("zoomanim", { center: map.getCenter(), zoom: map.getZoom() + 1, noUpdate: false })
    expect(canvas.style.transform).toContain("scale(2)")
    map.remove()
  })

  it("sets the canvas opacity", () => {
    const { map, layer, canvas } = setup()
    layer.setOpacity(0.75)
    expect(canvas.style.opacity).toBe("0.75")
    map.remove()
  })

  it("removes its canvas", () => {
    const { map, layer } = setup()
    layer.remove()
    // eslint-disable-next-line testing-library/no-node-access -- the canvas is created by Leaflet, not React
    expect(map.getPane("overlayPane")!.querySelector("canvas")).toBeNull()
    map.remove()
  })
})
```

Run: `npm test -- hot-spot-canvas-layer`
Expected: FAIL. The module doesn't exist.

**Step 2: Implement**

```ts
import {
  DomUtil, LatLng, Layer, LayerOptions, LeafletEventHandlerFn, Map as LeafletMap, Point, setOptions, ZoomAnimEvent
} from "leaflet"
import { IDensityGridRegion, kHotSpotCellSize, kHotSpotPadding } from "./hot-spot-utils"

export type HotSpotDrawFunction = (context: CanvasRenderingContext2D, region: IDensityGridRegion) => void

// Leaflet's own renderers use this private method to position themselves during zoom animations
interface ILeafletMapInternals {
  _getNewPixelOrigin(center: LatLng, zoom: number): Point
}

/**
 * A canvas covering the map's viewport plus padding, in its own pane. The canvas has one backing pixel per grid
 * cell and is stretched to kHotSpotCellSize CSS pixels per cell, so the browser smooths between cells.
 * Modeled on Leaflet's L.Renderer.
 */
export class HotSpotCanvasLayer extends Layer {
  private canvas?: HTMLCanvasElement
  private drawFunction?: HotSpotDrawFunction
  private opacity = 1
  // The view the canvas was last drawn for, used to transform it during zooms
  private drawnCenter?: LatLng
  private drawnZoom = 0

  constructor(options?: LayerOptions) {
    super()
    // L.Layer has no initialize method, so Leaflet doesn't apply constructor options for us
    setOptions(this, options)
  }

  onAdd() {
    this.canvas = DomUtil.create("canvas", "codap-hot-spot-canvas leaflet-zoom-animated")
    this.canvas.style.opacity = String(this.opacity)
    this.getPane()?.appendChild(this.canvas)
    this.redraw()
    return this
  }

  onRemove() {
    this.canvas && DomUtil.remove(this.canvas)
    this.canvas = undefined
    return this
  }

  getEvents() {
    return {
      viewreset: this.redraw,
      moveend: this.redraw,
      zoom: this.onZoom,
      zoomanim: this.onAnimZoom as LeafletEventHandlerFn
    }
  }

  setDrawFunction(drawFunction: HotSpotDrawFunction) {
    this.drawFunction = drawFunction
    return this.redraw()
  }

  setOpacity(opacity: number) {
    this.opacity = opacity
    if (this.canvas) this.canvas.style.opacity = String(opacity)
    return this
  }

  redraw() {
    const map: Maybe<LeafletMap> = this._map
    const { canvas } = this
    if (!map || !canvas) return this
    const size = map.getSize()
    const topLeft = size.multiplyBy(-kHotSpotPadding).round()
    const cols = Math.ceil(size.x * (1 + 2 * kHotSpotPadding) / kHotSpotCellSize)
    const rows = Math.ceil(size.y * (1 + 2 * kHotSpotPadding) / kHotSpotCellSize)
    // setting the size also clears the canvas
    canvas.width = cols
    canvas.height = rows
    canvas.style.width = `${cols * kHotSpotCellSize}px`
    canvas.style.height = `${rows * kHotSpotCellSize}px`
    DomUtil.setPosition(canvas, map.containerPointToLayerPoint(topLeft))
    this.drawnCenter = map.getCenter()
    this.drawnZoom = map.getZoom()
    const context = canvas.getContext("2d")
    if (context && cols > 0 && rows > 0) {
      this.drawFunction?.(context, {
        originX: topLeft.x, originY: topLeft.y, cols, rows, cellSize: kHotSpotCellSize
      })
    }
    return this
  }

  private onZoom() {
    this.updateTransform(this._map.getCenter(), this._map.getZoom())
  }

  private onAnimZoom(event: ZoomAnimEvent) {
    this.updateTransform(event.center, event.zoom)
  }

  // Scales and offsets the canvas drawn for drawnCenter/drawnZoom to where it belongs at the given view.
  // Same computation as L.Renderer._updateTransform.
  private updateTransform(center: LatLng, zoom: number) {
    const map: Maybe<LeafletMap> = this._map
    if (!map || !this.canvas || !this.drawnCenter) return

    const scale = map.getZoomScale(zoom, this.drawnZoom)
    const viewHalf = map.getSize().multiplyBy(0.5 + kHotSpotPadding)
    const drawnCenterPoint = map.project(this.drawnCenter, zoom)
    const newPixelOrigin = (map as unknown as ILeafletMapInternals)._getNewPixelOrigin(center, zoom)
    const topLeftOffset = viewHalf.multiplyBy(-scale).add(drawnCenterPoint).subtract(newPixelOrigin)
    DomUtil.setTransform(this.canvas, topLeftOffset, scale)
  }
}
```

Notes:
- `L.Renderer` falls back to `setPosition` when `Browser.any3d` is false. jsdom reports false, and every browser
  CODAP supports has CSS 3D transforms, so this always uses `setTransform`. That keeps the zoom test meaningful.
- `zoomanim` only fires when the map animates zooms, so registering it unconditionally is harmless.
- Map resizes (`invalidateSize`, which CODAP triggers with `trackResize`) fire `moveend`, so there's no separate
  `resize` handler.
- `leaflet.css` already positions `.leaflet-pane > canvas` absolutely, and `.leaflet-zoom-animated` sets
  `transform-origin: 0 0` and the zoom transition.
- `onRemove` uses `&&` for its side effect, which the lint config allows (`allowShortCircuit`).
- If jsdom rejects the `translate3d(...)` transform string so that the zoom test sees an empty transform, check
  `canvas.style.cssText`. If jsdom really drops it, assert on a `jest.spyOn(DomUtil, "setTransform")` call
  instead.

Run: `npm test -- hot-spot-canvas-layer`
Expected: PASS.

**Step 3: Commit**

```
Add HotSpotCanvasLayer for drawing hot spots in a Leaflet pane (CODAP-1642)
```

---

## Phase 4: Wire up

## Task 10: Render the surface in `MapHotSpotLayer`

**Files:**
- Modify: `components/map/components/map-hot-spot-layer.tsx`
- Modify: `components/map/components/map-hot-spot-layer.test.tsx`

**Step 1: Write the failing tests**

Change `mountHotSpotLayer` to accept an optional setup callback and to return the point layer as well:

```ts
  function mountHotSpotLayer(setup?: (pointLayer: IMapPointLayerModel) => void) {
    const pointLayer = MapPointLayerModel.create()
    pointLayer.hotSpotModel.setIsVisible(true)
    setup?.(pointLayer)
    let leafletMap: LeafletMap | null = null
    render(
      <MapContainer ref={map => { leafletMap = map }} center={[0, 0]} zoom={1}>
        <MapHotSpotLayer mapPointLayerModel={pointLayer}/>
      </MapContainer>
    )
    return { leafletMap: leafletMap as unknown as LeafletMap, pointLayer }
  }

  // eslint-disable-next-line testing-library/no-node-access -- the canvas is created by Leaflet, not React
  const hotSpotCanvas = (leafletMap: LeafletMap) => leafletMap.getPane(kHotSpotPaneName)?.querySelector("canvas")
```

Update the two existing tests to destructure `{ leafletMap }`. Then add:

```ts
  it("adds a hot spot canvas when shown and removes it when hidden", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { leafletMap, pointLayer } = mountHotSpotLayer()
    expect(hotSpotCanvas(leafletMap)).toBeTruthy()
    act(() => pointLayer.hotSpotModel.setIsVisible(false))
    expect(hotSpotCanvas(leafletMap)).toBeFalsy()
  })

  it("shows hot spots even when the points are hidden", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { leafletMap } = mountHotSpotLayer(pointLayer => pointLayer.setPointsAreVisible(false))
    expect(hotSpotCanvas(leafletMap)).toBeTruthy()
  })

  it("applies the hot spot opacity to the canvas", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const { leafletMap } = mountHotSpotLayer()
    expect(hotSpotCanvas(leafletMap)?.style.opacity).toBe("0.75")
  })
```

Import `IMapPointLayerModel` alongside `MapPointLayerModel`. Wrap `setIsVisible(false)` in `act` because the
component must re-render. If the model's actions are protected outside of an action context in this test, wrap
the call the way the existing feature-flag call is wrapped.

Run: `npm test -- map-hot-spot-layer`
Expected: FAIL. There is no canvas, only the placeholder rectangle.

**Step 2: Implement**

Replace the placeholder effect in `map-hot-spot-layer.tsx`:

```tsx
import { useEffect, useRef } from "react"
import { observer } from "mobx-react-lite"
import { Map as LeafletMap } from "leaflet"
import { useMap } from "react-leaflet"
import { useDebouncedCallback } from "use-debounce"
import { isFeatureEnabled } from "../../../models/feature-flags/feature-flag-manager"
import { mstReaction } from "../../../utilities/mst-reaction"
import { IMapPointLayerModel } from "../models/map-point-layer-model"
import { HotSpotCanvasLayer } from "../utilities/hot-spot-canvas-layer"
import { buildColorLUT, renderHotSpotSurface } from "../utilities/hot-spot-utils"
import { createLatLongProjector } from "../utilities/map-utils"

// ... kHotSpotPaneName and getHotSpotPane unchanged ...

export const MapHotSpotLayer = observer(function MapHotSpotLayer({ mapPointLayerModel }: IProps) {
  const leafletMap = useMap()
  const { isVisible, hotSpotModel } = mapPointLayerModel
  const show = isFeatureEnabled("mapHotSpot") && isVisible && hotSpotModel.isVisible
  const { opacity } = hotSpotModel
  const layerRef = useRef<HotSpotCanvasLayer>()
  // Coalesce bursts of changes (e.g. while dragging a point) into one redraw
  const redraw = useDebouncedCallback(() => layerRef.current?.redraw(), 10)

  useEffect(() => {
    if (!show) return

    getHotSpotPane(leafletMap)
    const layer = new HotSpotCanvasLayer({ pane: kHotSpotPaneName })
    layerRef.current = layer

    // Observing the surface keeps MobX's cached copy alive while the hot spots are shown.
    // Install this before the first draw so that draw reads the cached surface.
    const disposeReaction = mstReaction(
      () => [mapPointLayerModel.hotSpotSurface, hotSpotModel.lowColor, hotSpotModel.highColor],
      () => redraw(),
      { name: "MapHotSpotLayer.redraw" }, mapPointLayerModel)

    layer.setDrawFunction((context, region) => {
      const surface = mapPointLayerModel.hotSpotSurface
      if (!surface) return

      const imageData = context.createImageData(region.cols, region.rows)
      const zoomScale = leafletMap.getZoomScale(leafletMap.getZoom(), 0)
      const lut = buildColorLUT(hotSpotModel.lowColor, hotSpotModel.highColor)
      renderHotSpotSurface(surface, createLatLongProjector(leafletMap), zoomScale, region, lut, imageData.data)
      context.putImageData(imageData, 0, 0)
    })
    layer.addTo(leafletMap)

    return () => {
      disposeReaction()
      redraw.cancel()
      layer.remove()
      layerRef.current = undefined
    }
  }, [hotSpotModel, leafletMap, mapPointLayerModel, redraw, show])

  // Declared after the effect above so it runs after the layer is created when show turns on
  useEffect(() => {
    layerRef.current?.setOpacity(opacity)
  }, [opacity, show])

  return null
})
```

The `LeafletMap` import is still used by `getHotSpotPane`. Remove the `rectangle` import.

Notes:
- `n = 0` (no surface): the draw function returns without drawing, and `redraw` has already cleared the canvas,
  so nothing shows (§4).
- The surface is recomputed synchronously whenever it is invalidated while observed (for example on every
  value change during a point drag). Only the redraw is debounced. If dragging large datasets is slow, add a
  MobX `delay` or throttle to the reaction in the performance story.
- `buildColorLUT` runs on every draw. That's about 512 color parses, well under a millisecond, so caching it
  isn't worth the extra state.

Run: `npm test -- map-hot-spot-layer`
Expected: PASS.

Then run the whole map directory: `npm test -- components/map`
Expected: PASS.

**Step 3: Commit**

```
Draw the kernel density hot spot surface on the map (CODAP-1642)
```

## Task 11: Cypress check and manual verification

**Files:**
- Modify: `v3/cypress/e2e/map.spec.ts`

**Step 1: Add a light Cypress test**

Add a `context` that visits Four Seals with the flag on and toggles the hot spot checkbox. Use the helpers and
imports `map.spec.ts` already has: `map.getDisplayConfigButton()` opens the layers palette, and the hot spot
checkbox is `[data-testid=map-layers-checkbox-hot-spot]`.

```ts
context("Map hot spots", () => {
  beforeEach(() => {
    cy.visit(`${Cypress.config("index")}?suppressUnsavedWarning&features=mapHotSpot#file=examples:Four%20Seals`)
  })

  it("adds and removes the hot spot canvas", () => {
    // select the map tile first, as the other inspector tests in this file do
    map.getDisplayConfigButton().click()
    cy.get("[data-testid=map-layers-checkbox-hot-spot]").first().click()
    map.getMapTile().find(".codap-hot-spot-canvas").should("exist")
    cy.get("[data-testid=map-layers-checkbox-hot-spot]").first().click()
    map.getMapTile().find(".codap-hot-spot-canvas").should("not.exist")
  })
})
```

Before writing the selection step, check how other tests in `map.spec.ts` select the map tile (e.g.
`c.selectTile("map", 0)`).

Run (dev server running; from VS Code, unset `ELECTRON_RUN_AS_NODE`):
`env -u ELECTRON_RUN_AS_NODE npm run test:cypress -- --spec cypress/e2e/map.spec.ts`
Expected: PASS.

**Step 2: Commit**

```
Add Cypress check for toggling map hot spots (CODAP-1642)
```

**Step 3: Manual verification (user)**

With `?features=mapHotSpot`:

- [ ] Four Seals and a US-cities dataset: hot spots line up with the points, the brightest area is white, and
      areas away from the data are dark at 75% opacity.
- [ ] Zoom in and out, including with the zoom buttons (animated). The canvas scales smoothly during the
      animation and redraws sharply afterward. The brightness at a given place doesn't change with zoom.
- [ ] Drag the map. The hot spots move with it, and the padded edge redraws when the drag ends.
- [ ] A dataset crossing the antimeridian (e.g. points near Fiji at ±180°): one connected hot spot, matching
      the displayed points.
- [ ] Hide, filter, and set aside cases, and edit or drag a point's lat/long. The hot spots update.
- [ ] Hide the points (`pointsAreVisible`). The hot spots remain. Hide the layer. The hot spots disappear.
- [ ] Undo/redo of the hot spot toggle adds and removes the canvas.
- [ ] Save and reopen a document with hot spots on.
- [ ] ~5k points: record the time for the surface computation and for a redraw (Performance panel) for the
      performance story.
