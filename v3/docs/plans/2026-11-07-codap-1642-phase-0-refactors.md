# CODAP-1642 Phase 0: Shared-Code Refactors — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract map and geo code that the hot spot feature will need into shared utilities, and switch
the existing call sites to use them, before any hot spot code is written.

**Architecture:** Five refactors (R1–R5 in the design doc,
[2026-11-06-codap-1642-kde-hot-spots-design.md](2026-11-06-codap-1642-kde-hot-spots-design.md)).
R1–R4 are pure-function extractions. R5 moves the point layer's "point data changed" subscriptions
from the `MapPointLayer` React component into `MapPointLayerModel` as observable version counters.
Every task preserves behavior except where a task explicitly says otherwise.

**Tech Stack:** TypeScript, MobX / MobX-State-Tree, Leaflet, colord, Jest.

---

## Conventions for this plan

- All `npm` commands run from `v3/`. All `git` commands run from the repo root (`v3/`'s parent).
- **Commits:** per CLAUDE.md, show the proposed commit message to the user and get explicit approval
  before every commit. The messages below are proposals. End each with the
  `Co-Authored-By` line from the session's attribution instructions.
- After each task: `npm run lint` and `npm run build:tsc` must be clean.
- Task order: R3 → R4 → R2 → R1 → R5. R3 and R4 are independent and small; R1 builds on R2's call
  sites; R5 touches the most code.

## Deviation from the design doc

The design doc puts the **mean-center** helper in `geo-utils.ts` as part of R3. Nothing uses it
until the hot spot math, so it is **not** part of Phase 0. It will be added to `geo-utils.ts` (with
its tests) in the hot spot plan. Phase 0 stays a pure refactor.

---

## Task 1 (R3): Extract `greatCircleDistance` into `geo-utils.ts`

**Files:**
- Create: `v3/src/utilities/geo-utils.ts`
- Create: `v3/src/utilities/geo-utils.test.ts`
- Modify: `v3/src/models/formula/functions/other-functions.ts:107-124`
- Existing test (must still pass): `v3/src/models/formula/functions/other-functions.test.ts:115-136`

**Step 1: Write the failing test**

`v3/src/utilities/geo-utils.test.ts`:

```ts
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
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/utilities/geo-utils.test.ts`
Expected: FAIL. The module `./geo-utils` cannot be found.

**Step 3: Implement**

`v3/src/utilities/geo-utils.ts`:

```ts
/**
 * Mean radius of the Earth, used for great-circle distances. Note that Leaflet's Web Mercator
 * projection (EPSG:3857) uses a different sphere (radius 6378137 m). Use that radius, not this one,
 * when converting distances to projected map units.
 */
export const kEarthMeanRadiusMeters = 6371000

const toRadians = (degrees: number) => degrees * Math.PI / 180

/**
 * Returns the great-circle (haversine) distance in meters between two points given in degrees.
 */
export function greatCircleDistance(lat1: number, long1: number, lat2: number, long2: number) {
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLong = toRadians(long2 - long1)
  const a = Math.sin(deltaLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLong / 2) ** 2
  return 2 * kEarthMeanRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

**Step 4: Run the test to verify it passes**

Run: `npm test -- src/utilities/geo-utils.test.ts`
Expected: PASS (5 tests).

**Step 5: Switch the formula function to the shared implementation**

In `other-functions.ts`, add the import
`import { greatCircleDistance } from "../../../utilities/geo-utils"`. Then replace the inline math
(the body of the `if` at lines 116–122) with:

```ts
      if (lat1 != null && long1 != null && lat2 != null && long2 != null) {
        return greatCircleDistance(lat1, long1, lat2, long2) / 1000
      }
```

The formula's documented unit (kilometers) is unchanged.

**Step 6: Run the formula tests**

Run: `npm test -- src/models/formula/functions/other-functions.test.ts`
Expected: PASS, with no test changes.

**Step 7: Lint, type check, commit**

Run: `npm run lint && npm run build:tsc`

Proposed commit message: `Extract greatCircleDistance into geo-utils (CODAP-1642)`

---

## Task 2 (R4): Extract `interpolateRgba` from `interpolateColors`

**Files:**
- Modify: `v3/src/utilities/color-utils.ts:137-145`
- Test: `v3/src/utilities/color-utils.test.ts`

**Step 1: Write the failing test**

Add `interpolateRgba` to the import on line 1 of `color-utils.test.ts`, and add this test after the
existing `interpolateColors` test (line 139):

```ts
  it("interpolateRgba returns unrounded numeric RGBA", () => {
    expect(interpolateRgba("#000000", "#ffffff", 0)).toEqual({ r: 0, g: 0, b: 0, a: 1 })
    expect(interpolateRgba("#000000", "#ffffff", 1)).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(interpolateRgba("#000000", "#ffffff", 0.5)).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 })
    // alpha interpolates alongside RGB
    expect(interpolateRgba("#ff0000ff", "#ff000000", 0.25)).toEqual({ r: 255, g: 0, b: 0, a: 0.75 })
  })
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/utilities/color-utils.test.ts`
Expected: FAIL. `interpolateRgba` is not a function.

**Step 3: Implement**

Replace `interpolateColors` in `color-utils.ts` with:

```ts
/**
 * Linearly interpolates each RGBA channel between two colors. Channels are not rounded, so callers
 * that need exact values (e.g. filling a Uint8ClampedArray) control the rounding.
 */
export function interpolateRgba(color1: string, color2: string, t: number): RgbaColor {
  const rgb1 = colord(color1).toRgb()
  const rgb2 = colord(color2).toRgb()
  return {
    r: rgb1.r + t * (rgb2.r - rgb1.r),
    g: rgb1.g + t * (rgb2.g - rgb1.g),
    b: rgb1.b + t * (rgb2.b - rgb1.b),
    a: rgb1.a + t * (rgb2.a - rgb1.a)
  }
}

export function interpolateColors(color1: string, color2: string, percentage: number) {
  return colord(interpolateRgba(color1, color2, percentage)).toHex()
}
```

`RgbaColor` is already imported as a type on line 3.

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/utilities/color-utils.test.ts`
Expected: PASS. The existing `interpolateColors` and `getChoroplethColors` tests are unchanged and
still pass.

**Step 5: Lint, type check, commit**

Run: `npm run lint && npm run build:tsc`

Proposed commit message: `Extract interpolateRgba from interpolateColors (CODAP-1642)`

---

## Task 3 (R2a): Add `getCaseLatLong` utility

**Files:**
- Modify: `v3/src/components/map/utilities/map-utils.ts`
- Test: `v3/src/components/map/utilities/map-utils.test.ts`

**Step 1: Write the failing test**

Add `getCaseLatLong` to the `./map-utils` import in `map-utils.test.ts`, and `toCanonical` to the
`DataSet` import. Then add:

```ts
describe("getCaseLatLong", () => {
  const dataset = DataSet.create()
  dataset.addAttribute({ id: "latId", name: "lat" })
  dataset.addAttribute({ id: "longId", name: "long" })
  dataset.addCases(toCanonical(dataset, [
    { __id__: "valid", lat: 42.5, long: -71.2 },
    { __id__: "zero", lat: 0, long: 0 },
    { __id__: "missingLat", lat: "", long: -71.2 },
    { __id__: "nonNumeric", lat: 42.5, long: "east" }
  ]))

  it("returns the case's lat/long", () => {
    expect(getCaseLatLong(dataset, "valid", "latId", "longId")).toEqual({ lat: 42.5, long: -71.2 })
  })

  it("returns zero coordinates, which are valid", () => {
    expect(getCaseLatLong(dataset, "zero", "latId", "longId")).toEqual({ lat: 0, long: 0 })
  })

  it("returns undefined when either value is missing or non-numeric", () => {
    expect(getCaseLatLong(dataset, "missingLat", "latId", "longId")).toBeUndefined()
    expect(getCaseLatLong(dataset, "nonNumeric", "latId", "longId")).toBeUndefined()
  })

  it("returns undefined for an unknown case", () => {
    expect(getCaseLatLong(dataset, "nope", "latId", "longId")).toBeUndefined()
  })
})
```

Check that `addCases` with these item IDs makes the cases addressable by `__id__` with `getNumeric`,
as the existing tests in this file do with `DataSet`. If the dataset assigns its own case IDs, look the
IDs up from `dataset.items` instead.

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/map/utilities/map-utils.test.ts`
Expected: FAIL. `getCaseLatLong` is not a function.

**Step 3: Implement**

Add to `map-utils.ts`, below `shiftLongitudeIntoView`. `IDataSet` and `isFiniteNumber` are already
imported.

```ts
/**
 * Returns the case's latitude and longitude, or undefined if either value is missing or not a finite number.
 */
export const getCaseLatLong = (dataset: IDataSet, caseID: string, latId: string, longId: string)
    : Maybe<{ lat: number, long: number }> => {
  const lat = dataset.getNumeric(caseID, latId)
  const long = dataset.getNumeric(caseID, longId)
  return isFiniteNumber(lat) && isFiniteNumber(long) ? { lat, long } : undefined
}
```

**Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/map/utilities/map-utils.test.ts`
Expected: PASS.

**Step 5: Lint, type check.** Don't commit yet; Task 4 completes R2.

---

## Task 4 (R2b): `MapPointLayerModel.getCaseLatLong` view, and switch the call sites

**Files:**
- Modify: `v3/src/components/map/models/map-point-layer-model.ts`
- Create: `v3/src/components/map/models/map-point-layer-model.test.ts`
- Modify: `v3/src/components/map/components/map-point-layer.tsx` (lines 62–89, 214–229, 329–347)
- Modify: `v3/src/components/map/components/map-pin-layer.tsx:164-170`
- Modify: `v3/src/components/map/models/map-grid-model.ts:63-71`

**Step 1: Write the failing model test**

`map-point-layer-model.test.ts`. As the comment in `data-configuration-legend-operability.test.ts`
explains, the data configuration must share an MST tree with the dataset, so build a small tree:

```ts
import { Instance, types } from "@concord-consortium/mobx-state-tree"
import { DataSet, toCanonical } from "../../../models/data/data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { MapPointLayerModel } from "./map-point-layer-model"

const TreeModel = types.model("Tree", {
  data: DataSet,
  metadata: DataSetMetadata,
  layer: MapPointLayerModel
})

export function createPointLayerTree() {
  const tree = TreeModel.create({ data: {}, metadata: {}, layer: {} })
  tree.data.addAttribute({ id: "latId", name: "lat" })
  tree.data.addAttribute({ id: "longId", name: "long" })
  tree.metadata.setData(tree.data)
  tree.data.addCases(toCanonical(tree.data, [
    { __id__: "c1", lat: 42, long: -71 },
    { __id__: "c2", lat: 42, long: -71 },
    { __id__: "c3", lat: "", long: -71 }
  ]))
  tree.layer.dataConfiguration.setDataset(tree.data, tree.metadata)
  tree.layer.dataConfiguration.setAttribute("lat", { attributeID: "latId" })
  tree.layer.dataConfiguration.setAttribute("long", { attributeID: "longId" })
  return tree
}

describe("MapPointLayerModel.getCaseLatLong", () => {
  it("returns the case's lat/long using the layer's attributes", () => {
    const tree = createPointLayerTree()
    expect(tree.layer.getCaseLatLong("c1")).toEqual({ lat: 42, long: -71 })
  })

  it("returns undefined for a case without valid coordinates", () => {
    const tree = createPointLayerTree()
    expect(tree.layer.getCaseLatLong("c3")).toBeUndefined()
  })

  it("returns undefined when the layer has no lat/long attributes", () => {
    const layer = MapPointLayerModel.create()
    expect(layer.getCaseLatLong("c1")).toBeUndefined()
  })
})
```

Exporting `createPointLayerTree` keeps the setup in one place for Tasks 6–8. If Jest complains about
exports from a test file, move the helper to `map-point-layer-model.test-utils.ts`.

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/map/models/map-point-layer-model.test.ts`
Expected: FAIL. `getCaseLatLong` is not a function.

**Step 3: Implement the view**

In `map-point-layer-model.ts`, import `getCaseLatLong` from `"../utilities/map-utils"` and add to the
existing `.views` block, after `pointAttributes`:

```ts
    getCaseLatLong(caseID: string) {
      const { dataset } = self.dataConfiguration
      const attrs = this.pointAttributes
      return dataset && attrs ? getCaseLatLong(dataset, caseID, attrs.latId, attrs.longId) : undefined
    },
```

**Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/map/models/map-point-layer-model.test.ts`
Expected: PASS.

**Step 5: Switch the call sites**

The point layer's `|| 0` fallbacks only ever applied to cases from `getCaseDataArray(0)`, which
`_filterCase` has already limited to cases with valid lat/long values. So "skip on undefined" is
equivalent in practice. Each site:

- **`map-point-layer.tsx` `connectingLine`:** replace the `getCoords`/`getScreenX`/`getScreenY`
  helpers. Read `mapLayerModel.getCaseLatLong(caseID)` once. Return `undefined` (no line point) if it is
  undefined; otherwise project it once and use `.x`/`.y`. Task 5 replaces the projection itself. For
  now keep `shiftLongitudeIntoView` + `latLngToContainerPoint`. This also removes the double projection
  (the old `getScreenX` and `getScreenY` each projected the same case).
- **`map-point-layer.tsx` `refreshHeatmap`:** replace the `long`/`lat` reads (lines 224–225) with
  `const latLong = mapLayerModel.getCaseLatLong(caseID); if (!latLong) return` inside the `forEach`.
  The `latId`/`longId` guard at line 215 becomes unnecessary, since `getCaseLatLong` covers it.
- **`map-point-layer.tsx` `refreshPoints`:** replace `getCoords`/`getScreenX`/`getScreenY`. Inside
  `forEachPoint`, read `getCaseLatLong(caseID)` and only call `renderer.setPointPosition` when it is
  defined (still apply the style). Project once per point instead of twice. The
  `latId`/`longId` early return at lines 361–362 still guards the styling, so keep it.
- **`map-pin-layer.tsx`:** replace lines 165–167 with
  `const latLong = getCaseLatLong(dataset, __id__, pinLatId, pinLongId); if (!latLong) return null`.
  Pins belong to a different layer model, so use the free function, not the point-layer view.
- **`map-grid-model.ts` `computeCounts`:** replace lines 64–66 with
  `const latLong = latId && longId ? getCaseLatLong(dataset, caseID, latId, longId) : undefined`.
  Hoist `latId`/`longId` from `dataConfiguration.attributeID(...)` above the `forEach`, and guard on
  `dataset`. This also stops a `NaN` value from producing a `NaN` grid index; the old `!== undefined`
  check let `NaN` through.

**Step 6: Run the map tests**

Run: `npm test -- src/components/map`
Expected: PASS.

**Step 7: Manual smoke check**

Run `npm start` and open a document with a point map, a pin layer, connecting lines, and the heatmap
(legend attribute + "heatmap" display type). Points, pins, lines, and heatmap render as before; panning
across the antimeridian still works.

**Step 8: Lint, type check, commit**

Run: `npm run lint && npm run build:tsc`

Proposed commit message: `Add getCaseLatLong and use it for map lat/long reads (CODAP-1642)`

---

## Task 5 (R1): Add `createLatLongProjector` and switch the call sites

**Files:**
- Modify: `v3/src/components/map/utilities/map-utils.ts`
- Test: `v3/src/components/map/utilities/map-utils.test.ts`
- Modify: `v3/src/components/map/components/map-point-layer.tsx` (connecting lines, heatmap, points)
- Modify: `v3/src/components/map/components/map-pin-layer.tsx`

**Step 1: Write the failing test**

The projector must return exactly what the inline code returned. The tests compare it against
`latLngToContainerPoint` + `shiftLongitudeIntoView` on a real Leaflet map. jsdom has no layout, so
give the container a size before creating the map.

Add `createLatLongProjector` to the `./map-utils` import, and `Map as LeafletMap` to the `leaflet`
import. Then add:

```ts
describe("createLatLongProjector", () => {
  function createMap(center: [number, number], zoom: number) {
    const container = document.createElement("div")
    Object.defineProperty(container, "clientWidth", { value: 400 })
    Object.defineProperty(container, "clientHeight", { value: 300 })
    document.body.appendChild(container)
    return new LeafletMap(container, { center, zoom })
  }

  function inlineProjection(map: LeafletMap, lat: number, long: number) {
    const bounds = map.getBounds()
    return map.latLngToContainerPoint([lat, shiftLongitudeIntoView(long, bounds.getWest(), bounds.getEast())])
  }

  it("matches the inline projection in an ordinary view", () => {
    const map = createMap([40, -95], 4)
    const project = createLatLongProjector(map)
    for (const [lat, long] of [[40, -95], [30, -120], [48, -70]]) {
      expect(project(lat, long)).toEqual(inlineProjection(map, lat, long))
    }
    map.remove()
  })

  it("shifts longitudes into a view that crosses the antimeridian", () => {
    const map = createMap([60, 180], 4)
    const project = createLatLongProjector(map)
    // -175 lies just east of the dateline, so it must project to the right of +175
    expect(project(60, -175).x).toBeGreaterThan(project(60, 175).x)
    expect(project(60, -175)).toEqual(inlineProjection(map, 60, -175))
    map.remove()
  })
})
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/map/utilities/map-utils.test.ts`
Expected: FAIL. `createLatLongProjector` is not a function.

**Step 3: Implement**

In `map-utils.ts`, add `Point` to the `leaflet` import, then add below `shiftLongitudeIntoView`:

```ts
export type LatLongProjector = (lat: number, long: number) => Point

/**
 * Returns a function that projects a latitude/longitude to map container pixels, shifting the longitude
 * into the world copy nearest the current viewport (see shiftLongitudeIntoView). The viewport bounds
 * are read when the projector is created, so create one per refresh and reuse it for every point in
 * that refresh.
 */
export const createLatLongProjector = (map: LeafletMap): LatLongProjector => {
  const bounds = map.getBounds()
  const west = bounds.getWest()
  const east = bounds.getEast()
  return (lat, long) => map.latLngToContainerPoint([lat, shiftLongitudeIntoView(long, west, east)])
}
```

**Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/map/utilities/map-utils.test.ts`
Expected: PASS.

**Step 5: Switch the call sites**

- **`map-point-layer.tsx` connecting lines:** change `connectingLine(caseID, west, east)` to
  `connectingLine(caseID, project: LatLongProjector)`. In `connectingLinesForCases`, replace the
  bounds lines (93–96) with `const project = createLatLongProjector(leafletMap)` and pass it in.
  `leafletMap` drops out of `connectingLine`'s dependency array.
- **`refreshHeatmap`:** replace the bounds lines (217–219) with
  `const project = createLatLongProjector(leafletMap)`, and use
  `const point = project(latLong.lat, latLong.long)`.
- **`refreshPoints`:** replace the bounds lines (330–332) with
  `const project = createLatLongProjector(leafletMap)`.
- **`map-pin-layer.tsx`:** replace the bounds lines (151–153) with
  `const project = createLatLongProjector(map)`, and use
  `const { x, y } = project(latLong.lat, latLong.long)`.
- Remove the now-unused `shiftLongitudeIntoView` imports from both components.

**Step 6: Run the map tests, then smoke check as in Task 4 Step 7**

Run: `npm test -- src/components/map`
Expected: PASS.

**Step 7: Lint, type check, commit**

Run: `npm run lint && npm run build:tsc`

Proposed commit message: `Add createLatLongProjector for map point projection (CODAP-1642)`

---

## Task 6 (R5a): Confirm the suspected grid bug

`MapGridModel` reacts to `dataConfiguration.caseDataHash`, which hashes only *which* cases are plotted,
not their values. This test checks whether editing a latitude updates the grid counts.

**Files:**
- Create: `v3/src/components/map/models/map-grid-model.test.ts`

**Step 1: Write the test**

```ts
import { createPointLayerTree } from "./map-point-layer-model.test"

describe("MapGridModel", () => {
  it("updates its counts when a case's coordinates change", () => {
    const tree = createPointLayerTree()
    const { gridModel } = tree.layer
    gridModel.setIsVisible(true)
    gridModel.initializeGrid()
    // c1 and c2 share a location (c3 has no latitude), so one cell holds both
    expect(gridModel.maxCount).toBe(2)

    tree.data.setCaseValues([{ __id__: "c2", latId: -30, longId: 120 }])

    expect(gridModel.maxCount).toBe(1)
  })
})
```

If importing from a test file causes Jest to also run that file's tests here, move
`createPointLayerTree` to `map-point-layer-model.test-utils.ts` (see Task 4) and import it from there.

**Step 2: Run it**

Run: `npm test -- src/components/map/models/map-grid-model.test.ts`

- **Expected: FAIL** (`maxCount` stays 2). That confirms the bug, and Task 8 fixes it. Leave the test
  failing, and don't commit it yet; it is committed with the fix in Task 8.
- **If it passes**, something already recomputes the grid on value changes. Find out what (e.g. the
  grid component forcing `initializeGrid`), note it in the design doc's R5 section, keep the test as a
  regression test, and skip the grid part of Task 8.

---

## Task 7 (R5b): Point-data version counters on `MapPointLayerModel`

**Files:**
- Modify: `v3/src/components/map/models/map-point-layer-model.ts`
- Test: `v3/src/components/map/models/map-point-layer-model.test.ts`

### Design

Two counters, so the point layer can still tell its two kinds of refresh apart:

| Volatile | Bumped by | Point layer response (unchanged from today) |
|---|---|---|
| `pointCasesVersion` | `dataConfiguration.caseDataHash` changes (cases added, removed, hidden, filtered, set aside) | `callMatchCirclesToData()`, `refreshPoints(false)`, `refreshHeatmap()` |
| `pointValuesVersion` | `setCaseValues`/`setComputedCaseValues`, `addCases`/`removeCases` actions; lat/long attribute type changes | `refreshPoints(pointValuesChangedWhileCaching)`, `refreshHeatmap()`, plus `refreshConnectingLines()` for type changes (see below) |

Plus:
- `pointValuesChangedWhileCaching: boolean`. It is set with every values bump: `dataset.isCaching()` for value
  actions, `false` otherwise. It keeps the point layer's "restyle only selected points while caching" fast path.
- `get pointDataVersion()`: `pointCasesVersion + pointValuesVersion`. Consumers that don't care which kind
  of change happened (hot spots, grid) observe this one value.

The lat/long type reaction moves here too, including its `dataConfiguration.invalidateCases()` call. That
way it runs once, no matter how many components are listening.

Listener lifecycle: the dataset `onAnyAction` listener has to follow `dataConfiguration.dataset`. Install a
reaction on the dataset (with `fireImmediately: true`) that disposes the previous `onAnyAction` listener
and attaches a new one. Register both the reaction and the final listener with `addDisposer`.

Bumps happen in actions on volatile state. That follows the precedent of `MapGridModel.incrementChangeCount`:
volatile changes produce no patches, so they don't create undo entries.

**Step 1: Write the failing tests**

Append to `map-point-layer-model.test.ts`:

```ts
import { selectCases } from "../../../models/data/data-set-utils"

describe("MapPointLayerModel point-data versions", () => {
  it("bumps pointCasesVersion when the set of plotted cases changes", () => {
    const tree = createPointLayerTree()
    const before = tree.layer.pointCasesVersion
    tree.layer.dataConfiguration.addNewHiddenCases(["c1"])
    expect(tree.layer.pointCasesVersion).toBeGreaterThan(before)
  })

  it("bumps pointValuesVersion when a value changes", () => {
    const tree = createPointLayerTree()
    const before = tree.layer.pointValuesVersion
    tree.data.setCaseValues([{ __id__: "c1", latId: 10 }])
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(before)
    expect(tree.layer.pointValuesChangedWhileCaching).toBe(false)
  })

  it("records a value change made while the dataset is caching", () => {
    const tree = createPointLayerTree()
    tree.data.beginCaching()
    tree.data.setCaseValues([{ __id__: "c1", latId: 10 }])
    expect(tree.layer.pointValuesChangedWhileCaching).toBe(true)
    tree.data.endCaching()
  })

  it("bumps both pointCasesVersion and pointValuesVersion when cases are added", () => {
    const tree = createPointLayerTree()
    const cases = tree.layer.pointCasesVersion, values = tree.layer.pointValuesVersion
    tree.data.addCases(toCanonical(tree.data, [{ __id__: "c4", lat: 10, long: 10 }]))
    expect(tree.layer.pointCasesVersion).toBeGreaterThan(cases)
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(values)
  })

  it("bumps pointValuesVersion and re-filters cases when a lat/long attribute's type changes", () => {
    const tree = createPointLayerTree()
    const before = tree.layer.pointValuesVersion
    const invalidate = jest.spyOn(tree.layer.dataConfiguration, "invalidateCases")
    tree.data.attrFromID("latId")?.setUserType("categorical")
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(before)
    expect(invalidate).toHaveBeenCalled()
  })

  it("does not bump either version on selection changes", () => {
    const tree = createPointLayerTree()
    const version = tree.layer.pointDataVersion
    selectCases(["c1"], tree.data)
    expect(tree.layer.pointDataVersion).toBe(version)
  })

  it("follows the data configuration to a new dataset", () => {
    const tree = createPointLayerTree()
    const other = DataSet.create()
    other.addAttribute({ id: "latId", name: "lat" })
    other.addAttribute({ id: "longId", name: "long" })
    other.addCases(toCanonical(other, [{ __id__: "d1", lat: 1, long: 1 }]))
    tree.layer.dataConfiguration.setDataset(other, undefined)
    const before = tree.layer.pointValuesVersion
    other.setCaseValues([{ __id__: "d1", latId: 2 }])
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(before)
  })
})
```

Before relying on these tests, verify a few APIs against the code: `setUserType` on attributes,
`attrFromID`, and `setDataset` accepting an `undefined` metadata. `jest.spyOn` on an MST action may need
`unprotect` or may not work at all. If not, assert the effect of `invalidateCases()` instead (a case whose
latitude becomes non-numeric drops out of `getCaseDataArray(0)`). The dataset-switch test uses a dataset
outside the tree; if `setDataset` rejects that, add a second dataset to `TreeModel`.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/models/map-point-layer-model.test.ts`
Expected: FAIL. The version properties are undefined.

**Step 3: Implement**

In `map-point-layer-model.ts`:

```ts
import { comparer, reaction } from "mobx"
import { addDisposer } from "mobx-state-tree"
import { isCaseValueChangeAction } from "../../../models/data/data-set-actions"
import { onAnyAction } from "../../../utilities/mst-utils"
```

Add after `.props(...)`:

```ts
  .volatile(() => ({
    pointCasesVersion: 0,
    pointValuesVersion: 0,
    pointValuesChangedWhileCaching: false
  }))
  .views(self => ({
    get pointDataVersion() {
      return self.pointCasesVersion + self.pointValuesVersion
    }
  }))
```

Add the bump actions to the existing `.actions` block, and extend `afterCreate`:

```ts
    bumpPointCasesVersion() {
      self.pointCasesVersion++
    },
    bumpPointValuesVersion(whileCaching = false) {
      self.pointValuesChangedWhileCaching = whileCaching
      self.pointValuesVersion++
    },
```

```ts
    afterCreate() {
      self.gridModel.setDataConfiguration(self.dataConfiguration)
      const { dataConfiguration } = self

      // The set of plotted cases changed (added, removed, hidden, filtered, set aside)
      addDisposer(self, reaction(
        () => dataConfiguration.caseDataHash,
        () => (self as IMapPointLayerModel).bumpPointCasesVersion(),
        { name: "MapPointLayerModel.pointCasesVersion" }
      ))

      // Changing a lat/long attribute's type changes its numeric values and which cases are valid
      addDisposer(self, reaction(
        () => [dataConfiguration.attributeType("lat"), dataConfiguration.attributeType("long")],
        () => {
          dataConfiguration.invalidateCases()
          ;(self as IMapPointLayerModel).bumpPointValuesVersion()
        },
        { name: "MapPointLayerModel.latLongTypeChange", equals: comparer.structural }
      ))

      // Value changes and case additions/removals in whichever dataset the layer is showing
      let disposeActionListener: Maybe<() => void>
      addDisposer(self, reaction(
        () => dataConfiguration.dataset,
        dataset => {
          disposeActionListener?.()
          disposeActionListener = dataset && onAnyAction(dataset, action => {
            if (isCaseValueChangeAction(action)) {
              (self as IMapPointLayerModel).bumpPointValuesVersion(dataset.isCaching())
            } else if (["addCases", "removeCases"].includes(action.name)) {
              (self as IMapPointLayerModel).bumpPointValuesVersion()
            }
          })
        },
        { name: "MapPointLayerModel.datasetActions", fireImmediately: true }
      ))
      addDisposer(self, () => disposeActionListener?.())
    },
```

The bump actions are defined in the same `.actions` block as `afterCreate`, so `self` isn't typed with
them yet. Either cast as shown, or (cleaner) define `bumpPointCasesVersion`/`bumpPointValuesVersion` in
an earlier `.actions` block and drop the casts. Prefer the latter. `IMapPointLayerModel` is declared
below the model in this file; if the cast causes a circular-type error, the earlier-block approach
avoids it.

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/models/map-point-layer-model.test.ts`
Expected: PASS.

**Step 5: Run all map tests**

Run: `npm test -- src/components/map`
Expected: PASS. The grid test from Task 6 still fails at this point, since nothing uses the counters yet.

**Step 6: Lint and type check.** Don't commit yet; Task 8 completes R5.

---

## Task 8 (R5c): Point layer and grid use the counters

**Files:**
- Modify: `v3/src/components/map/components/map-point-layer.tsx:385-499`
- Modify: `v3/src/components/map/models/map-grid-model.ts`
- Test: `v3/src/components/map/models/map-grid-model.test.ts` (from Task 6)

**Step 1: Grid model.** Add a volatile `pointDataSource: undefined as Maybe<{ pointDataVersion: number }>`
and an action `setPointDataSource(source)`. In `afterCreate`, change the reaction's expression from
`self.dataConfiguration?.caseDataHash` to `self.pointDataSource?.pointDataVersion`. In
`MapPointLayerModel.afterCreate`, call `self.gridModel.setPointDataSource(self)` next to
`setDataConfiguration`.

Every case-set change still reaches the grid, because `pointCasesVersion` bumps whenever `caseDataHash` changes.

Run: `npm test -- src/components/map/models/map-grid-model.test.ts`
Expected: PASS (the Task 6 test now passes).

**Step 2: Point layer.** In `map-point-layer.tsx`:

1. In `setupResponsesToDatasetActions` (lines 386–415), delete the `isCaseValueChangeAction` and
   `addCases`/`removeCases` branches. Selection handling stays. Rename the effect to
   `setupResponsesToSelectionActions`, and drop `refreshPoints`/`refreshHeatmap` from its dependencies.
   Remove the now-unused `isCaseValueChangeAction` import.
2. Delete `setupResponseToLatLongTypeChange` (lines 477–488). The model now does the invalidation.
3. Replace `setupResponseToChangeInCases` (lines 490–499) with two reactions:

```tsx
  // The set of plotted cases changed: re-match the renderer's points to the cases, then redraw
  useEffect(function setupResponseToChangeInCases() {
    return mstReaction(
      () => mapLayerModel.pointCasesVersion,
      () => {
        callMatchCirclesToData()
        refreshPoints(false)
        refreshHeatmap()
      }, {name: "MapPointLayer.setupResponseToChangeInCases", fireImmediately: true}, mapLayerModel
    )
  }, [callMatchCirclesToData, mapLayerModel, refreshHeatmap, refreshPoints])

  // Plotted values changed. While the dataset is caching only selected cases change, so only they are restyled.
  useEffect(function setupResponseToChangeInValues() {
    return mstReaction(
      () => mapLayerModel.pointValuesVersion,
      () => {
        refreshPoints(mapLayerModel.pointValuesChangedWhileCaching)
        refreshConnectingLines()
        refreshHeatmap()
      }, {name: "MapPointLayer.setupResponseToChangeInValues"}, mapLayerModel
    )
  }, [mapLayerModel, refreshConnectingLines, refreshHeatmap, refreshPoints])
```

**Known behavior change:** connecting lines previously refreshed only on lat/long *type* changes, not
on value edits or case additions. With this change they refresh on all of these. `refreshConnectingLines`
returns early when lines are hidden, so the cost only applies when lines are shown. Check during the
smoke test whether lines previously went stale after a value edit. If they did, this is a fix; mention
it in the PR.

**Step 3: Run the map tests**

Run: `npm test -- src/components/map`
Expected: PASS.

**Step 4: Run the full Jest suite**

Run: `npm test`
Expected: PASS.

**Step 5: Map Cypress spec** (requires `npm start` running in another terminal; unset
`ELECTRON_RUN_AS_NODE` if running from VS Code)

Run: `npm run test:cypress -- --spec cypress/e2e/map.spec.ts`
Expected: PASS.

**Step 6: Manual smoke check**

With `npm start`, on a point map:
- Edit a lat/long value in the table: the point moves, and connecting lines and heatmap follow.
- Drag a value with a graph slider or formula so the dataset caches: points update smoothly.
- Add and delete cases; hide and show cases; apply a filter formula: points, grid, and heatmap update.
- Change the lat attribute's type to categorical and back: points disappear and return.
- Turn on the grid, edit a latitude: the grid counts update (the Task 6 bug).
- Switch the layer's dataset (if the UI allows it): updates still flow.

**Step 7: Lint, type check, commit**

Run: `npm run lint && npm run build:tsc`

Proposed commit message:
`Move map point-data change tracking into MapPointLayerModel; fix grid counts after value edits (CODAP-1642)`

---

## Completion checklist

- [ ] Tasks 1–8 committed, each with a user-approved message.
- [ ] `npm test`, `npm run lint`, `npm run build:tsc` clean.
- [ ] `map.spec.ts` Cypress spec passes.
- [ ] Design doc's R5 "suspected bug" paragraph updated with the Task 6 result.
- [ ] Note for the PR description: the connecting-line refresh change (Task 8) and the grid count fix.
