# Hot Spot Color Binning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let the user draw the map's hot spot layer in 2 through 10 flat color classes, or continuously (the
default), with a new "Color binning" slider in the map's layers palette.

**Architecture:** `hot-spot-utils.ts` gets the bin count limits, one function that applies them
(`getEffectiveColorBins`), and a `buildColorLUT` that takes a bin count. `MapHotSpotModel` stores the count in a
new `colorBins` property (a number or `"continuous"`), with a volatile in-progress value and two views that apply
the limits. A new `MapHotSpotBinningSlider` component edits it, and `MapHotSpotLayer` passes it to
`buildColorLUT`.

**Tech Stack:** TypeScript, React 18, MobX-State-Tree, react-aria-components (`Slider`), d3 (`rgb`), Jest with
React Testing Library.

**Design:** [hot-spot-binning-design.md](hot-spot-binning-design.md). Read it first. Where this plan and the
design disagree, the design wins; stop and ask.

---

## Before you start

- Branch: `codap-1646-hot-spot-bins` (already created from `main`).
- Run `npm` commands from `v3/`. Run `git` commands from the repository root.
- Run one test file with `npm test -- <path relative to v3>`.
- Code style: no semicolons, double quotes, lines of at most 120 characters.
- **Commits:** `CLAUDE.md` requires showing each commit message to the user and getting approval before
  committing. The messages below are proposals.
- The feature is behind the `mapHotSpot` feature flag. Component tests turn it on with
  `featureFlagManager.setServerConfig({ mapHotSpot: "on" })`.
- Each task is test-first: write the tests, watch them fail for the stated reason, then implement.

### Files touched

| File (under `v3/src/`) | Change |
| --- | --- |
| `components/map/utilities/hot-spot-utils.ts` | Limits, `getEffectiveColorBins`, slider conversions, binned `buildColorLUT` |
| `components/map/models/map-hot-spot-model.ts` | `colorBins`, `dynamicColorBins`, views, actions, snapshot filter |
| `v2/codap-v2-types.ts` | `colorBins` on `ICodapV2MapHotSpotStorage` |
| `components/map/components/map-hot-spot-layer.tsx` | Watch and pass `displayColorBins` |
| `utilities/translation/lang/en-US.json5` | Five strings |
| `components/map/components/inspector-panel/map-hot-spot-binning-slider.tsx` | New component |
| `components/map/components/inspector-panel/map-hot-spot-control.tsx` | Render the slider |
| `components/map/components/inspector-panel/map-inspector.scss` | Readout style |

Each has a test file alongside it, named in its task.

---

### Task 1: Bin count limits and slider conversions

**Files:**
- Modify: `v3/src/components/map/utilities/hot-spot-utils.ts`
- Test: `v3/src/components/map/utilities/hot-spot-utils.test.ts`

**Step 1: Write the failing tests**

Add these names to the existing import from `"./hot-spot-utils"` in the test file: `colorBinsToSliderValue`,
`getEffectiveColorBins`, `isHotSpotColorBins`, `kContinuousColorBins`, `kContinuousSliderValue`, `kMaxColorBins`,
`kMinColorBins`, `sliderValueToColorBins`. Then add, before `describe("buildColorLUT", ...)`:

```ts
describe("color bin limits", () => {
  it("allows 2 through 10 bins, with continuous one slider step past the maximum", () => {
    expect(kMinColorBins).toBe(2)
    expect(kMaxColorBins).toBe(10)
    expect(kContinuousSliderValue).toBe(11)
    expect(kContinuousColorBins).toBe("continuous")
  })

  it("recognizes valid stored values", () => {
    expect(isHotSpotColorBins("continuous")).toBe(true)
    expect(isHotSpotColorBins(5)).toBe(true)
    // out of range but finite: valid to store, limited when used
    expect(isHotSpotColorBins(15)).toBe(true)
    expect(isHotSpotColorBins(0)).toBe(true)
    expect(isHotSpotColorBins("many")).toBe(false)
    expect(isHotSpotColorBins("5")).toBe(false)
    expect(isHotSpotColorBins(NaN)).toBe(false)
    expect(isHotSpotColorBins(Infinity)).toBe(false)
    expect(isHotSpotColorBins(null)).toBe(false)
    expect(isHotSpotColorBins(undefined)).toBe(false)
  })

  it("keeps continuous and in-range counts", () => {
    expect(getEffectiveColorBins("continuous")).toBe("continuous")
    expect(getEffectiveColorBins(2)).toBe(2)
    expect(getEffectiveColorBins(7)).toBe(7)
    expect(getEffectiveColorBins(10)).toBe(10)
  })

  it("treats counts below the minimum as the minimum and above the maximum as the maximum", () => {
    expect(getEffectiveColorBins(1)).toBe(2)
    expect(getEffectiveColorBins(0)).toBe(2)
    expect(getEffectiveColorBins(-3)).toBe(2)
    expect(getEffectiveColorBins(-Infinity)).toBe(2)
    expect(getEffectiveColorBins(11)).toBe(10)
    expect(getEffectiveColorBins(100)).toBe(10)
    expect(getEffectiveColorBins(Infinity)).toBe(10)
  })

  it("rounds non-integer counts", () => {
    expect(getEffectiveColorBins(2.4)).toBe(2)
    expect(getEffectiveColorBins(2.6)).toBe(3)
    expect(getEffectiveColorBins(1.2)).toBe(2)
    expect(getEffectiveColorBins(10.4)).toBe(10)
  })

  it("treats NaN as continuous", () => {
    expect(getEffectiveColorBins(NaN)).toBe("continuous")
  })

  it("converts between color bins and slider values", () => {
    expect(colorBinsToSliderValue("continuous")).toBe(11)
    expect(colorBinsToSliderValue(2)).toBe(2)
    expect(colorBinsToSliderValue(10)).toBe(10)
    // out-of-range counts sit at the nearest numeric end, never at the continuous position
    expect(colorBinsToSliderValue(15)).toBe(10)
    expect(colorBinsToSliderValue(0)).toBe(2)
    expect(colorBinsToSliderValue(3.6)).toBe(4)

    expect(sliderValueToColorBins(11)).toBe("continuous")
    expect(sliderValueToColorBins(10)).toBe(10)
    expect(sliderValueToColorBins(2)).toBe(2)
  })
})
```

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/utilities/hot-spot-utils.test.ts`
Expected: FAIL. TypeScript reports that `hot-spot-utils` has no exported member `getEffectiveColorBins` (and
the others).

**Step 3: Implement**

In `hot-spot-utils.ts`, add this immediately above `export const kColorLUTSize = 256`:

```ts
/** The number of color classes the density is drawn in, or "continuous" for a smooth gradient */
export type HotSpotColorBins = number | "continuous"
export const kContinuousColorBins = "continuous"
export const kMinColorBins = 2
export const kMaxColorBins = 10
/** The binning slider's position for continuous, one step past the most classes */
export const kContinuousSliderValue = kMaxColorBins + 1

/** True if the value can be stored as a hot spot's color bins. */
export function isHotSpotColorBins(value: unknown): value is HotSpotColorBins {
  return value === kContinuousColorBins || (typeof value === "number" && Number.isFinite(value))
}

/**
 * Returns the color bins to use for the given value: continuous, or a whole number of classes from kMinColorBins
 * to kMaxColorBins. Counts are rounded, then limited to that range. NaN can't be saved, so treating it as
 * continuous (the default) is only a guard.
 */
export function getEffectiveColorBins(colorBins: HotSpotColorBins): HotSpotColorBins {
  if (colorBins === kContinuousColorBins || Number.isNaN(colorBins)) return kContinuousColorBins
  return Math.min(kMaxColorBins, Math.max(kMinColorBins, Math.round(colorBins)))
}

/** Converts color bins to the binning slider's position */
export function colorBinsToSliderValue(colorBins: HotSpotColorBins) {
  const effectiveColorBins = getEffectiveColorBins(colorBins)
  return effectiveColorBins === kContinuousColorBins ? kContinuousSliderValue : effectiveColorBins
}

/** Converts the binning slider's position to color bins */
export function sliderValueToColorBins(value: number): HotSpotColorBins {
  return value > kMaxColorBins ? kContinuousColorBins : value
}
```

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/utilities/hot-spot-utils.test.ts`
Expected: PASS, all tests.

**Step 5: Commit**

```bash
git add v3/src/components/map/utilities/hot-spot-utils.ts v3/src/components/map/utilities/hot-spot-utils.test.ts
git commit -m "Add hot spot color bin limits and slider conversions."
```

---

### Task 2: `buildColorLUT` bins the colors

**Files:**
- Modify: `v3/src/components/map/utilities/hot-spot-utils.ts` (`buildColorLUT`)
- Test: `v3/src/components/map/utilities/hot-spot-utils.test.ts`

**Background.** The lookup table has 256 RGBA entries; entry `i` is for the normalized density `i / 255`. The
monochrome ramp runs from black at 0 to white at 1, so an entry's red value shows which ramp position it was
colored with. `hotSpotFade(t)` is 0 at `t ≤ 0.02` and 1 at `t ≥ 0.35`.

**Step 1: Write the failing tests**

Add inside the existing `describe("buildColorLUT", ...)`, which already defines `rgbaAt`:

```ts
  describe("with color bins", () => {
    const monochrome = getHotSpotRampInterpolator("monochrome", "", "")
    // Expects every entry from first to last to be the given color
    const expectRange = (lut: Uint8ClampedArray, first: number, last: number, rgba: number[]) => {
      for (let i = first; i <= last; i++) {
        expect(rgbaAt(lut, i)).toEqual(rgba)
      }
    }

    it("is unchanged when continuous", () => {
      expect(buildColorLUT(monochrome, "continuous")).toEqual(buildColorLUT(monochrome))
    })

    it("draws 2 bins as the transparent low color and the high color", () => {
      const lut = buildColorLUT(monochrome, 2)
      expectRange(lut, 0, 127, [0, 0, 0, 0])
      expectRange(lut, 128, 255, [255, 255, 255, 255])
    })

    it("draws 3 bins as the low color, the middle of the ramp and the high color", () => {
      const lut = buildColorLUT(monochrome, 3)
      // Entries 85 and 170 are exactly on the bin edges (1/3 and 2/3), so floating point decides their bin
      expectRange(lut, 0, 84, [0, 0, 0, 0])
      expectRange(lut, 86, 169, [128, 128, 128, 255])
      expectRange(lut, 171, 255, [255, 255, 255, 255])
    })

    it("draws 4 bins at 0, 1/3, 2/3 and 1 along the ramp, each with the fade at its ramp position", () => {
      const lut = buildColorLUT(monochrome, 4)
      // the bin edges are at entries 63.75, 127.5 and 191.25
      expectRange(lut, 0, 63, [0, 0, 0, 0])
      // 1/3 is just below kHotSpotFadeFull, so this bin is not quite opaque
      const partialAlpha = Math.round(hotSpotFade(1 / 3) * 255)
      expect(partialAlpha).toBeLessThan(255)
      expectRange(lut, 64, 127, [85, 85, 85, partialAlpha])
      expectRange(lut, 128, 191, [170, 170, 170, 255])
      expectRange(lut, 192, 255, [255, 255, 255, 255])
    })

    it("uses the ramp's own end colors", () => {
      const lut = buildColorLUT(getHotSpotRampInterpolator("heat", "", ""), 5)
      // #000004, fully faded
      expect(rgbaAt(lut, 0)).toEqual([0, 0, 4, 0])
      // #fcffa4
      expect(rgbaAt(lut, 255)).toEqual([252, 255, 164, 255])
    })

    it("has exactly as many distinct colors as bins", () => {
      for (let bins = kMinColorBins; bins <= kMaxColorBins; bins++) {
        const lut = buildColorLUT(monochrome, bins)
        const colors = new Set(Array.from({ length: kColorLUTSize }, (_, i) => rgbaAt(lut, i).join()))
        expect(colors.size).toBe(bins)
      }
    })

    it("treats counts below 2 as 2 and counts above 10 as 10", () => {
      const twoBins = buildColorLUT(monochrome, 2)
      expect(buildColorLUT(monochrome, 1)).toEqual(twoBins)
      expect(buildColorLUT(monochrome, 0)).toEqual(twoBins)
      expect(buildColorLUT(monochrome, -3)).toEqual(twoBins)
      const tenBins = buildColorLUT(monochrome, 10)
      expect(buildColorLUT(monochrome, 11)).toEqual(tenBins)
      expect(buildColorLUT(monochrome, 100)).toEqual(tenBins)
    })

    it("rounds a non-integer count", () => {
      expect(buildColorLUT(monochrome, 2.6)).toEqual(buildColorLUT(monochrome, 3))
    })
  })
```

`hotSpotFade`, `kColorLUTSize` and `buildColorLUT` are already imported in this file. Check, and add any that
are not.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/utilities/hot-spot-utils.test.ts`
Expected: FAIL. TypeScript reports "Expected 1 arguments, but got 2" for `buildColorLUT`.

**Step 3: Implement**

Replace `buildColorLUT` and its doc comment with:

```ts
/**
 * Returns a lookup table of kColorLUTSize RGBA colors (4 bytes each) sampled along the ramp, from low density to
 * high. Each entry's alpha is multiplied by hotSpotFade, so low densities fade to transparent.
 *
 * With n color bins, the density range is split into n equal bins and every entry in bin k (0 to n − 1) gets the
 * ramp color, and the fade, at k / (n − 1). The lowest bin is therefore the low color and fully transparent, and
 * the highest is the high color. colorBins is limited by getEffectiveColorBins, so n is at least kMinColorBins.
 */
export function buildColorLUT(interpolator: ColorInterpolator, colorBins: HotSpotColorBins = kContinuousColorBins) {
  const bins = getEffectiveColorBins(colorBins)
  const lut = new Uint8ClampedArray(kColorLUTSize * 4)
  for (let i = 0; i < kColorLUTSize; i++) {
    const normalizedDensity = i / (kColorLUTSize - 1)
    // The ramp position this entry is colored with: its own density, or its bin's position when binned
    const rampPosition = bins === kContinuousColorBins
      ? normalizedDensity
      : Math.min(bins - 1, Math.floor(normalizedDensity * bins)) / (bins - 1)
    const { r, g, b, opacity } = rgb(interpolator(rampPosition))
    // Uint8ClampedArray rounds the alpha
    lut.set([r, g, b, opacity * hotSpotFade(rampPosition) * 255], i * 4)
  }
  return lut
}
```

The `Math.min(bins - 1, ...)` keeps the last entry (density 1, where `floor(1 · n)` is `n`) in the top bin.

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/utilities/hot-spot-utils.test.ts`
Expected: PASS, all tests, including the tests of the continuous table that were there before.

If the 4-bin test fails on the color `85` or `170`, print the actual value before changing anything: the
expected values assume d3's `interpolateRgb` rounds each channel, which is what the existing test's
`[128, 128, 128, 255]` at the midpoint relies on.

**Step 5: Commit**

```bash
git add v3/src/components/map/utilities/hot-spot-utils.ts v3/src/components/map/utilities/hot-spot-utils.test.ts
git commit -m "Build the hot spot color lookup table with color bins."
```

---

### Task 3: Model property, in-progress value and views

**Files:**
- Modify: `v3/src/components/map/models/map-hot-spot-model.ts`
- Test: `v3/src/components/map/models/map-hot-spot-model.test.ts`
- Test: `v3/src/components/map/v2-map-importer.test.ts` (one existing expectation)

**Step 1: Write the failing tests**

In `map-hot-spot-model.test.ts`:

1. In `"has defaults for the density display"`, add before the `isDefaultHotSpotModel` line:

   ```ts
       expect(hotSpot.colorBins).toBe("continuous")
   ```

2. In `"is not default when a display property differs"`, add:

   ```ts
       expect(isDefaultHotSpotModel(MapHotSpotModel.create({ colorBins: 5 }))).toBe(false)
   ```

3. In `"can set the display properties"`, add `hotSpot.setColorBins(5)` after `hotSpot.setHighColor("#ff0000")`,
   and change the expected snapshot to:

   ```ts
       expect(getSnapshot(hotSpot)).toEqual({
         isVisible: false, bandwidth: 5000, opacity: 0.5, colorRamp: "custom", lowColor: "#0000ff",
         highColor: "#ff0000", colorBins: 5
       })
   ```

4. Add a new `describe` after `describe("MapHotSpotModel opacity", ...)`:

   ```ts
   describe("MapHotSpotModel color bins", () => {
     it("uses the dynamic color bins while set and clears them when the color bins are committed", () => {
       const hotSpot = MapHotSpotModel.create()
       expect(hotSpot.effectiveColorBins).toBe("continuous")
       expect(hotSpot.displayColorBins).toBe("continuous")

       hotSpot.setDynamicColorBins(4)
       expect(hotSpot.displayColorBins).toBe(4)
       expect(hotSpot.effectiveColorBins).toBe("continuous")
       expect(hotSpot.colorBins).toBe("continuous")
       // the dynamic value is volatile, so it doesn't affect the snapshot
       expect(isDefaultHotSpotModel(hotSpot)).toBe(true)

       hotSpot.setColorBins(6)
       expect(hotSpot.dynamicColorBins).toBeUndefined()
       expect(hotSpot.colorBins).toBe(6)
       expect(hotSpot.effectiveColorBins).toBe(6)
       expect(hotSpot.displayColorBins).toBe(6)
     })

     it("shows continuous while it is the dynamic value, even with a number committed", () => {
       const hotSpot = MapHotSpotModel.create({ colorBins: 3 })
       hotSpot.setDynamicColorBins("continuous")
       expect(hotSpot.displayColorBins).toBe("continuous")
       expect(hotSpot.effectiveColorBins).toBe(3)
     })

     it("keeps an out-of-range count as saved but uses the nearest limit", () => {
       const tooMany = MapHotSpotModel.create({ colorBins: 15 })
       expect(tooMany.colorBins).toBe(15)
       expect(tooMany.effectiveColorBins).toBe(10)
       expect(tooMany.displayColorBins).toBe(10)
       expect(getSnapshot(tooMany).colorBins).toBe(15)

       const tooFew = MapHotSpotModel.create({ colorBins: 0 })
       expect(tooFew.colorBins).toBe(0)
       expect(tooFew.effectiveColorBins).toBe(2)
       expect(tooFew.displayColorBins).toBe(2)
       expect(getSnapshot(tooFew).colorBins).toBe(0)
     })

     it("limits an out-of-range dynamic value", () => {
       const hotSpot = MapHotSpotModel.create()
       hotSpot.setDynamicColorBins(15)
       expect(hotSpot.displayColorBins).toBe(10)
     })

     it("falls back to continuous when a snapshot's color bins are invalid", () => {
       const hotSpot = MapHotSpotModel.create({ isVisible: true, colorBins: "many", opacity: 0.5 })
       expect(hotSpot.colorBins).toBe("continuous")
       // the rest of the snapshot is kept
       expect(hotSpot.isVisible).toBe(true)
       expect(hotSpot.opacity).toBe(0.5)
       // JSON writes NaN and Infinity as null
       expect(MapHotSpotModel.create({ colorBins: null as any }).colorBins).toBe("continuous")

       // a native v3 document reaches the hot spot through its point layer's snapshot
       const layer = MapPointLayerModel.create({ hotSpotModel: { colorBins: "many", colorRamp: "viridis" } })
       expect(layer.hotSpotModel.colorBins).toBe("continuous")
       expect(layer.hotSpotModel.colorRamp).toBe("viridis")
     })

     it("keeps a valid color ramp when the color bins are invalid, and the reverse", () => {
       expect(MapHotSpotModel.create({ colorRamp: "rainbow", colorBins: 5 }).colorBins).toBe(5)
       expect(MapHotSpotModel.create({ colorRamp: "viridis", colorBins: "many" }).colorRamp).toBe("viridis")
     })

     it("round-trips color bins through the point layer's snapshot", () => {
       const layer = MapPointLayerModel.create()
       layer.hotSpotModel.setColorBins(7)
       expect(MapPointLayerModel.create(getSnapshot(layer)).hotSpotModel.colorBins).toBe(7)
     })
   })
   ```

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/models/map-hot-spot-model.test.ts`
Expected: FAIL. TypeScript reports that `colorBins`, `setColorBins`, `setDynamicColorBins`,
`effectiveColorBins` and `displayColorBins` do not exist.

**Step 3: Implement**

In `map-hot-spot-model.ts`:

1. Replace the import from `"../utilities/hot-spot-utils"` with:

   ```ts
   import {
     computeDefaultBandwidth, computeHotSpotSurface, getEffectiveColorBins, HotSpotColorBins, IHotSpotSurface,
     isHotSpotColorBins, kContinuousColorBins
   } from "../utilities/hot-spot-utils"
   ```

2. Change the comment above `BaseMapHotSpotModel` and add the property after `highColor`:

   ```ts
   // Separate from the real MapHotSpotModel so it can filter out an illegal colorRamp or colorBins.
   const BaseMapHotSpotModel = types.model("MapHotSpotModel", {
     // ...existing properties, unchanged...
     highColor: kDefaultHotSpotHighColor,
     colorBins: types.optional(
       types.union(types.literal(kContinuousColorBins), types.number), kContinuousColorBins)
   })
   ```

3. Replace the snapshot interface and `preProcessSnapshot`:

   ```ts
   // A saved colorRamp or colorBins is an unvalidated string: it may come from a build with ramps or bins this one doesn't have.
   export interface IMapHotSpotModelSnapshot
     extends Omit<SnapshotIn<typeof BaseMapHotSpotModel>, "colorRamp" | "colorBins"> {
     colorRamp?: string
     colorBins?: number | string
   }

   export const MapHotSpotModel = BaseMapHotSpotModel
     // Drop a color ramp this build doesn't know, or color bins that aren't valid, so the hot spot loads with
     // the default for that property
     .preProcessSnapshot((snap: Maybe<IMapHotSpotModelSnapshot>) => {
       const { colorRamp, colorBins, ...others } = snap ?? {}
       return {
         ...others,
         ...(isHotSpotColorRamp(colorRamp) ? { colorRamp } : {}),
         ...(isHotSpotColorBins(colorBins) ? { colorBins } : {})
       }
     })
   ```

4. Add `dynamicColorBins` to the volatile state:

   ```ts
       dynamicBandwidth: undefined as Maybe<number>,
       dynamicColorBins: undefined as Maybe<HotSpotColorBins>
   ```

5. Add two views to the views block that holds `displayOpacity` and `defaultBandwidth`:

   ```ts
       // The color bins that have been set (ignoring any in-progress slider value), limited to the allowed range
       get effectiveColorBins() {
         return getEffectiveColorBins(self.colorBins)
       },
       // The color bins to render: the in-progress slider value if there is one, otherwise the set value
       get displayColorBins() {
         return getEffectiveColorBins(self.dynamicColorBins ?? self.colorBins)
       },
   ```

6. Add two actions after `setHighColor`:

   ```ts
       setColorBins(colorBins: HotSpotColorBins) {
         self.colorBins = colorBins
         self.dynamicColorBins = undefined
       },
       setDynamicColorBins(colorBins: Maybe<HotSpotColorBins>) {
         self.dynamicColorBins = colorBins
       },
   ```

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/models/map-hot-spot-model.test.ts`
Expected: PASS.

If TypeScript rejects `MapHotSpotModel.create({ colorBins: "many" })`, the snapshot interface in step 3.3 is
not being used as the model's input type. Check that `preProcessSnapshot`'s parameter is typed
`Maybe<IMapHotSpotModelSnapshot>`, as it is for `colorRamp: "rainbow"` in the existing test.

**Step 5: Fix the one expectation the new default breaks**

Run: `npm test -- src/components/map/v2-map-importer.test.ts`
Expected: FAIL in `"round-trips non-default display properties"`. The model's snapshot now includes
`colorBins`, which the test's `hotSpot` object lacks.

In that test, change the `hotSpot` object to:

```ts
    const hotSpot = {
      isVisible: true, bandwidth: 5000, opacity: 0.5, colorRamp: "custom", lowColor: "#0000ff", highColor: "#ff0000",
      colorBins: 5
    }
```

Run it again. Expected: PASS, all tests in the file. (`"exports a point layer's v3 hot spot"` compares with
`kDefaultHotSpotSnapshot`, which picks up the new default by itself.)

**Step 6: Run the other map model tests**

Run: `npm test -- src/components/map/models`
Expected: PASS.

**Step 7: Commit**

```bash
git add v3/src/components/map/models/map-hot-spot-model.ts v3/src/components/map/models/map-hot-spot-model.test.ts \
  v3/src/components/map/v2-map-importer.test.ts
git commit -m "Add color bins to the hot spot model."
```

---

### Task 4: Import and export

No import or export logic changes: the hot spot snapshot is written whole to `v3.hotSpot` and read back as a
snapshot. This task adds the storage type and the tests that prove `colorBins` makes the trip.

**Files:**
- Modify: `v3/src/v2/codap-v2-types.ts` (`ICodapV2MapHotSpotStorage`, near line 547)
- Test: `v3/src/components/map/v2-map-importer.test.ts`

**Step 1: Write the tests**

Add after `"round-trips non-default display properties"`, in the same `describe`:

```ts
  it("round-trips continuous color bins with other non-default properties", () => {
    const { v2Document } = loadCodapDocument("roller-coasters-map-layer-formats.codap")
    const v2MapTile = v2Document.components.find(c => c.type === "DG.MapView")!
    const layerModels = (v2MapTile.componentStorage as any).mapModelStorage.layerModels
    const v2PointLayer = layerModels.find((l: any) => l.pointColor != null)
    const hotSpot = { ...kDefaultHotSpotSnapshot, isVisible: true }
    expect(hotSpot.colorBins).toBe("continuous")
    v2PointLayer.v3 = { ...v2PointLayer.v3, hotSpot }

    const tile = v2MapImporter({ v2Component: v2MapTile, v2Document, ...mockImporterArgs })
    const content = isMapContentModel(tile?.content) ? tile.content : undefined
    const layer = content!.layers.find((l: any) => l.type === "mapPointLayer")! as any
    expect(layer.hotSpotModel.colorBins).toBe("continuous")

    const out = v2MapExporter({ tile: tile! })
    const exportedLayers = (out!.componentStorage as any).mapModelStorage.layerModels
    expect(exportedLayers.find((l: any) => l.v3?.hotSpot)?.v3?.hotSpot).toEqual(hotSpot)
  })

  it("exports the hot spot when only the color bins differ from the default", () => {
    const { v2Document } = loadCodapDocument("roller-coasters-map-layer-formats.codap")
    const v2MapTile = v2Document.components.find(c => c.type === "DG.MapView")!
    const tile = v2MapImporter({ v2Component: v2MapTile, v2Document, ...mockImporterArgs })
    const content = isMapContentModel(tile?.content) ? tile.content : undefined
    const layer = content!.layers.find((l: any) => l.type === "mapPointLayer")! as any
    layer.hotSpotModel.setColorBins(4)

    const out = v2MapExporter({ tile: tile! })
    const layerModels = (out!.componentStorage as any).mapModelStorage.layerModels
    expect(layerModels.find((l: any) => l.v3?.hotSpot)?.v3?.hotSpot).toEqual({ ...kDefaultHotSpotSnapshot, colorBins: 4 })
  })

  it("keeps out-of-range color bins and falls back to continuous when they are invalid", () => {
    const importWithColorBins = (colorBins: unknown) => {
      const { v2Document } = loadCodapDocument("roller-coasters-map-layer-formats.codap")
      const v2MapTile = v2Document.components.find(c => c.type === "DG.MapView")!
      const layerModels = (v2MapTile.componentStorage as any).mapModelStorage.layerModels
      const v2PointLayer = layerModels.find((l: any) => l.pointColor != null)
      v2PointLayer.v3 = { ...v2PointLayer.v3, hotSpot: { isVisible: true, colorBins } }
      const tile = v2MapImporter({ v2Component: v2MapTile, v2Document, ...mockImporterArgs })
      const content = isMapContentModel(tile?.content) ? tile.content : undefined
      return (content!.layers.find((l: any) => l.type === "mapPointLayer")! as any).hotSpotModel
    }

    const tooMany = importWithColorBins(15)
    expect(tooMany.colorBins).toBe(15)
    expect(tooMany.effectiveColorBins).toBe(10)

    const invalid = importWithColorBins("many")
    expect(invalid.colorBins).toBe("continuous")
    // the rest of the saved hot spot is kept
    expect(invalid.isVisible).toBe(true)
  })
```

If the middle test's `toEqual` line is over 120 characters, break it after `.toEqual(`.

**Step 2: Run the tests**

Run: `npm test -- src/components/map/v2-map-importer.test.ts`
Expected: PASS. These pass without a code change because Task 3 did the work; they are here to pin the
behavior. If one fails, the model is not handling a snapshot as the design says: fix the model, not the test.

**Step 3: Add the storage type**

In `v3/src/v2/codap-v2-types.ts`, add to `ICodapV2MapHotSpotStorage` after `highColor?: string`:

```ts
  // A number of color classes, or "continuous". Illegal values are treated as "continuous".
  colorBins?: number | string
```

**Step 4: Type check**

Run: `npm run build:tsc`
Expected: no errors. The exporter assigns the model's snapshot to this type and the importer passes it to the
model, so a mismatch in either direction shows up here.

**Step 5: Commit**

```bash
git add v3/src/v2/codap-v2-types.ts v3/src/components/map/v2-map-importer.test.ts
git commit -m "Import and export hot spot color bins."
```

---

### Task 5: Draw the layer with the color bins

**Files:**
- Modify: `v3/src/components/map/components/map-hot-spot-layer.tsx`
- Test: `v3/src/components/map/components/map-hot-spot-layer.test.tsx`

**Step 1: Write the failing test**

In `map-hot-spot-layer.test.tsx`:

1. Add an import, and a second module mock below the existing one for `hot-spot-color-ramps`:

   ```ts
   import { buildColorLUT } from "../utilities/hot-spot-utils"
   ```

   ```ts
   // Wraps the real function so tests can see which color bins the layer draws with
   jest.mock("../utilities/hot-spot-utils", () => {
     const actual = jest.requireActual("../utilities/hot-spot-utils")
     return { ...actual, buildColorLUT: jest.fn(actual.buildColorLUT) }
   })
   ```

2. Add at the end of the `describe`:

   ```ts
     it("redraws with the model's color bins when they change", async () => {
       featureFlagManager.setServerConfig({ mapHotSpot: "on" })
       // jsdom gives the map no size and the canvas no context, and the layer draws only when it has both
       jest.spyOn(LeafletMap.prototype, "getSize").mockReturnValue(new Point(100, 100))
       const context = {
         createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
         putImageData: jest.fn()
       }
       jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as any)
       const buildLUT = jest.mocked(buildColorLUT)

       const { pointLayer } = mountHotSpotLayer(layer => {
         layer.hotSpotModel.setLatLongSource({ plottedLatLongs: [{ lat: 0, long: 0 }] })
       })
       expect(buildLUT).toHaveBeenLastCalledWith(expect.any(Function), "continuous")
       expect(context.putImageData).toHaveBeenCalledTimes(1)

       // an in-progress slider value redraws without being committed
       act(() => pointLayer.hotSpotModel.setDynamicColorBins(4))
       // the redraw is debounced
       await waitFor(() => expect(buildLUT).toHaveBeenLastCalledWith(expect.any(Function), 4))
       expect(context.putImageData).toHaveBeenCalledTimes(2)
       expect(pointLayer.hotSpotModel.colorBins).toBe("continuous")

       // an out-of-range count is drawn as the nearest limit
       act(() => pointLayer.hotSpotModel.setColorBins(15))
       await waitFor(() => expect(buildLUT).toHaveBeenLastCalledWith(expect.any(Function), 10))
       expect(context.putImageData).toHaveBeenCalledTimes(3)
     })
   ```

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/map/components/map-hot-spot-layer.test.tsx`
Expected: FAIL in the new test: `buildColorLUT` was last called with one argument, not
`(Function, "continuous")`. The other tests still pass.

**Step 3: Implement**

In `map-hot-spot-layer.tsx`:

1. Add `displayColorBins` to the values the reaction watches:

   ```ts
       const disposeReaction = mstReaction(
         () => [
           hotSpotModel.hotSpotSurface, hotSpotModel.colorRamp, hotSpotModel.lowColor, hotSpotModel.highColor,
           hotSpotModel.displayColorBins
         ],
   ```

2. Pass it to `buildColorLUT` in the draw function:

   ```ts
         const { colorRamp, displayColorBins, highColor, lowColor, hotSpotSurface } = hotSpotModel
         if (!hotSpotSurface) return

         const imageData = context.createImageData(region.cols, region.rows)
         const zoomScale = leafletMap.getZoomScale(leafletMap.getZoom(), 0)
         const lut = buildColorLUT(getHotSpotRampInterpolator(colorRamp, lowColor, highColor), displayColorBins)
   ```

Nothing else changes. The density surface does not depend on the color bins, so it is not recomputed.

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/components/map-hot-spot-layer.test.tsx`
Expected: PASS, all tests.

**Step 5: Commit**

```bash
git add v3/src/components/map/components/map-hot-spot-layer.tsx \
  v3/src/components/map/components/map-hot-spot-layer.test.tsx
git commit -m "Draw the hot spot layer with the model's color bins."
```

---

### Task 6: Strings

**Files:**
- Modify: `v3/src/utilities/translation/lang/en-US.json5`

Only `en-US.json5` is edited by hand; the other languages come from POEditor.

**Step 1: Add the inspector strings**

After the line `"V3.Inspector.map.hotSpotHighColor": "High color",` add:

```json5
    "V3.Inspector.map.hotSpotColorBinning": "Color binning",
    "V3.Inspector.map.hotSpotColorBinning.classes": "%@ classes",
    "V3.Inspector.map.hotSpotColorBinning.continuous": "continuous",
```

**Step 2: Add the undo and redo strings**

After the line `"V3.Redo.map.changeHotSpotHighColor": "Redo changing hot spot high color",` add:

```json5
    "V3.Undo.map.changeHotSpotColorBinning": "Undo changing hot spot color binning",
    "V3.Redo.map.changeHotSpotColorBinning": "Redo changing hot spot color binning",
```

**Step 3: Check the file still parses**

Run: `npm test -- src/utilities/translation`
Expected: PASS.

**Step 4: Commit**

```bash
git add v3/src/utilities/translation/lang/en-US.json5
git commit -m "Add strings for hot spot color binning."
```

---

### Task 7: The binning slider

**Files:**
- Create: `v3/src/components/map/components/inspector-panel/map-hot-spot-binning-slider.tsx`
- Create: `v3/src/components/map/components/inspector-panel/map-hot-spot-binning-slider.test.tsx`

**Background.** Model this on `map-hot-spot-resolution-slider.tsx` in the same folder; read it and its test
first. Two things it shows:

- `ValueTextSliderThumb` (in `src/components/common/`) replaces react-aria's `SliderThumb` so the thumb's
  `aria-valuetext` can be set. Screen readers announce that text in place of the number.
- A change is live while in progress (`setDynamic…`) and committed once, in `applyModelChange`, on
  `onChangeEnd` or when the thumb blurs. A keyboard step fires `onChange` and then `onChangeEnd`.

**Step 1: Write the failing tests**

Create `map-hot-spot-binning-slider.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ISerializedActionCall, onAction } from "mobx-state-tree"
import { AppHistoryService } from "../../../../models/history/app-history-service"
import { MapPointLayerModel } from "../../models/map-point-layer-model"
import { formatColorBins, MapHotSpotBinningSlider } from "./map-hot-spot-binning-slider"

// Includes any variables after the key, so tests can see the count in "n classes"
jest.mock("../../../../utilities/translation/translate", () => {
  const t = (key: string, options?: { vars?: unknown[] }) =>
    options?.vars ? `${key}:${options.vars.join(",")}` : key
  return { t, translate: t }
})

const kLabel = "V3.Inspector.map.hotSpotColorBinning"
const kContinuous = "V3.Inspector.map.hotSpotColorBinning.continuous"
const classes = (count: number) => `V3.Inspector.map.hotSpotColorBinning.classes:${count}`

// applyModelChange requires a history service in the MST environment
const createPointLayer = () => MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })

function mountShownSlider() {
  const pointLayer = createPointLayer()
  pointLayer.hotSpotModel.setIsVisible(true)
  render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)
  return pointLayer.hotSpotModel
}

describe("formatColorBins", () => {
  it("names the number of classes, or continuous", () => {
    expect(formatColorBins(5)).toBe(classes(5))
    expect(formatColorBins("continuous")).toBe(kContinuous)
  })

  it("names the nearest limit for an out-of-range count", () => {
    expect(formatColorBins(15)).toBe(classes(10))
    expect(formatColorBins(1)).toBe(classes(2))
  })
})

describe("MapHotSpotBinningSlider", () => {
  it("is continuous by default, at the far right, and disabled while the hot spot is hidden", () => {
    render(<MapHotSpotBinningSlider mapPointLayerModel={createPointLayer()}/>)

    expect(screen.getByRole("group", { name: kLabel })).toBeInTheDocument()
    const slider = screen.getByRole("slider", { name: kLabel })
    expect(slider).toHaveAttribute("min", "2")
    expect(slider).toHaveAttribute("max", "11")
    expect(slider).toHaveAttribute("step", "1")
    expect(slider).toHaveAttribute("value", "11")
    expect(slider).toHaveAttribute("aria-valuetext", kContinuous)
    expect(screen.getByTestId("map-hot-spot-color-binning-slider")).toHaveAttribute("data-disabled", "true")
  })

  it("shows the readout below the slider, hidden from screen readers", () => {
    const hotSpotModel = mountShownSlider()
    const readout = screen.getByText(kContinuous)
    expect(readout).toHaveClass("slider-readout")
    // the thumb's aria-valuetext already announces this text
    expect(readout).toHaveAttribute("aria-hidden", "true")

    act(() => hotSpotModel.setColorBins(5))
    expect(screen.getByText(classes(5))).toHaveClass("slider-readout")
  })

  it("commits the number of classes when the slider change ends", async () => {
    const user = userEvent.setup()
    const hotSpotModel = mountShownSlider()

    const slider = screen.getByRole("slider")
    expect(screen.getByTestId("map-hot-spot-color-binning-slider")).not.toHaveAttribute("data-disabled")
    act(() => slider.focus())
    await user.keyboard("{ArrowLeft}")
    expect(hotSpotModel.colorBins).toBe(10)
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
    expect(slider).toHaveAttribute("aria-valuetext", classes(10))
    expect(screen.getByText(classes(10))).toBeInTheDocument()

    await user.keyboard("{Home}")
    expect(hotSpotModel.colorBins).toBe(2)
    expect(slider).toHaveAttribute("aria-valuetext", classes(2))

    await user.keyboard("{End}")
    expect(hotSpotModel.colorBins).toBe("continuous")
    expect(slider).toHaveAttribute("aria-valuetext", kContinuous)
  })

  it("commits each change as one applyModelChange action", async () => {
    const user = userEvent.setup()
    const hotSpotModel = mountShownSlider()
    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))

    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    await user.keyboard("{ArrowLeft}")
    disposer()

    expect(actions.filter(({ name }) => name === "applyModelChange")).toHaveLength(1)
  })

  it("shows an in-progress value without committing it", () => {
    const hotSpotModel = mountShownSlider()
    act(() => hotSpotModel.setDynamicColorBins(4))

    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("value", "4")
    expect(slider).toHaveAttribute("aria-valuetext", classes(4))
    expect(screen.getByText(classes(4))).toBeInTheDocument()
    expect(hotSpotModel.colorBins).toBe("continuous")
  })

  it("doesn't change the model when released at the committed value", async () => {
    const user = userEvent.setup()
    const pointLayer = createPointLayer()
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    // 2 is the slider's minimum, so pressing Home doesn't move it
    hotSpotModel.setColorBins(2)
    // as if the slider had been dragged away and back
    hotSpotModel.setDynamicColorBins(2)
    render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)

    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    await user.keyboard("{Home}")
    disposer()

    // committing color bins is a single applyModelChange action, which wraps setColorBins
    expect(actions.map(({ name }) => name)).not.toContain("applyModelChange")
    expect(hotSpotModel.colorBins).toBe(2)
    // the in-progress change has ended
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
  })

  it("commits an in-progress value when the slider loses focus", () => {
    const hotSpotModel = mountShownSlider()
    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    // as if focus left in the middle of a change
    act(() => hotSpotModel.setDynamicColorBins(6))
    act(() => slider.blur())
    expect(hotSpotModel.colorBins).toBe(6)
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
  })

  it("doesn't change the model when the slider loses focus with no change in progress", () => {
    const hotSpotModel = mountShownSlider()
    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    act(() => slider.blur())
    disposer()
    expect(actions).toEqual([])
    expect(hotSpotModel.colorBins).toBe("continuous")
  })

  it("shows an out-of-range count as the nearest limit and keeps the saved value until a change is committed", () => {
    const pointLayer = createPointLayer()
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    hotSpotModel.setColorBins(15)
    render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("value", "10")
    expect(slider).toHaveAttribute("aria-valuetext", classes(10))
    expect(screen.getByText(classes(10))).toBeInTheDocument()

    // ending a change at 10, which is what 15 is treated as, commits nothing
    const actions: ISerializedActionCall[] = []
    const disposer = onAction(hotSpotModel, action => actions.push(action))
    act(() => slider.focus())
    act(() => hotSpotModel.setDynamicColorBins(10))
    act(() => slider.blur())
    disposer()
    expect(actions.map(({ name }) => name)).not.toContain("applyModelChange")
    expect(hotSpotModel.colorBins).toBe(15)
    expect(hotSpotModel.dynamicColorBins).toBeUndefined()
  })

  it("replaces an out-of-range count when a different value is committed", async () => {
    const user = userEvent.setup()
    const pointLayer = createPointLayer()
    const { hotSpotModel } = pointLayer
    hotSpotModel.setIsVisible(true)
    hotSpotModel.setColorBins(15)
    render(<MapHotSpotBinningSlider mapPointLayerModel={pointLayer}/>)

    const slider = screen.getByRole("slider")
    act(() => slider.focus())
    await user.keyboard("{ArrowLeft}")
    expect(hotSpotModel.colorBins).toBe(9)
  })
})
```

The test name on the `"shows an out-of-range count…"` line is over 120 characters with its indentation; shorten
it or break the call so lint passes.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/components/inspector-panel/map-hot-spot-binning-slider.test.tsx`
Expected: FAIL: cannot find module `./map-hot-spot-binning-slider`.

**Step 3: Implement**

Create `map-hot-spot-binning-slider.tsx`:

```tsx
import { observer } from "mobx-react-lite"
import { Label, Slider, SliderTrack } from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { t } from "../../../../utilities/translation/translate"
import { ValueTextSliderThumb } from "../../../common/value-text-slider-thumb"
import { IMapPointLayerModel } from "../../models/map-point-layer-model"
import {
  colorBinsToSliderValue, getEffectiveColorBins, HotSpotColorBins, kContinuousColorBins, kContinuousSliderValue,
  kMinColorBins, sliderValueToColorBins
} from "../../utilities/hot-spot-utils"

/** Formats color bins for the readout and for screen readers, e.g. "5 classes" or "continuous" */
export function formatColorBins(colorBins: HotSpotColorBins) {
  const effectiveColorBins = getEffectiveColorBins(colorBins)
  return effectiveColorBins === kContinuousColorBins
    ? t("V3.Inspector.map.hotSpotColorBinning.continuous")
    : t("V3.Inspector.map.hotSpotColorBinning.classes", { vars: [effectiveColorBins] })
}

interface IProps {
  mapPointLayerModel: IMapPointLayerModel
}

/**
 * Controls how many color classes the hot spot is drawn in: kMinColorBins through kMaxColorBins, or continuous at
 * the far right. The map updates as the slider moves, and the change is committed when it ends.
 */
export const MapHotSpotBinningSlider = observer(function MapHotSpotBinningSlider({ mapPointLayerModel }: IProps) {
  const { hotSpotModel } = mapPointLayerModel
  const { displayColorBins } = hotSpotModel
  const colorBinsText = formatColorBins(displayColorBins)

  const commitColorBins = (colorBins: HotSpotColorBins) => {
    // Compare with the effective value so that an out-of-range saved count isn't replaced by the limit it is
    // already treated as
    if (colorBins === hotSpotModel.effectiveColorBins) {
      // Nothing to commit, so just end the in-progress change.
      hotSpotModel.setDynamicColorBins(undefined)
      return
    }

    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setColorBins(colorBins)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotColorBinning",
      redoStringKey: "V3.Redo.map.changeHotSpotColorBinning",
      log: logStringifiedObjectMessage("mapAction: %@", {
        mapAction: "changeHotSpotColorBinning", colorBins, dataset: mapPointLayerModel.dataConfiguration.dataset?.name
      })
    })
  }

  // Commit any in-progress change if focus leaves before the change ends
  const handleBlur = () => {
    const { dynamicColorBins } = hotSpotModel
    if (dynamicColorBins != null) commitColorBins(getEffectiveColorBins(dynamicColorBins))
  }

  return (
    <Slider
      minValue={kMinColorBins}
      maxValue={kContinuousSliderValue}
      step={1}
      value={colorBinsToSliderValue(displayColorBins)}
      onChange={(val: number) => hotSpotModel.setDynamicColorBins(sliderValueToColorBins(val))}
      onChangeEnd={(val: number) => commitColorBins(sliderValueToColorBins(val))}
      isDisabled={!hotSpotModel.isVisible}
      data-testid="map-hot-spot-color-binning-slider"
    >
      <div className="palette-row slider-row">
        <Label className="form-label">{t("V3.Inspector.map.hotSpotColorBinning")}</Label>
        <SliderTrack>
          <ValueTextSliderThumb valueText={colorBinsText} onBlur={handleBlur}/>
        </SliderTrack>
      </div>
      {/* The thumb's aria-valuetext announces this text, so hide it from screen readers */}
      <div className="slider-readout" aria-hidden="true">{colorBinsText}</div>
    </Slider>
  )
})
```

Notes:
- The readout is a plain `div`, not interactive, so the `codap/require-testid` lint rule does not ask for a
  `data-testid` on it.
- `t`'s second argument takes `{ vars: [...] }`; each `%@` in the string is replaced in order. See
  `map-pin-layer.tsx` for another use.

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/components/inspector-panel/map-hot-spot-binning-slider.test.tsx`
Expected: PASS, all tests.

**Step 5: Lint**

Run: `npm run lint`
Expected: no errors or warnings. (The script lints the whole of `src`; it takes no path argument.)

**Step 6: Commit**

```bash
git add v3/src/components/map/components/inspector-panel/map-hot-spot-binning-slider.tsx \
  v3/src/components/map/components/inspector-panel/map-hot-spot-binning-slider.test.tsx
git commit -m "Add the hot spot color binning slider."
```

---

### Task 8: Put the slider in the palette

**Files:**
- Modify: `v3/src/components/map/components/inspector-panel/map-hot-spot-control.tsx`
- Modify: `v3/src/components/map/components/inspector-panel/map-inspector.scss`
- Test: `v3/src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx`

**Step 1: Write the failing test**

Add at the end of the `describe` in `map-hot-spot-control.test.tsx` (it uses `mountShownHotSpot` and
`highSwatch`, which are defined above it):

```tsx
  // Color binning slider

  it("renders the color binning slider last, below the high color", () => {
    mountShownHotSpot()
    const sliders = screen.getAllByRole("slider")
    expect(sliders).toHaveLength(3)
    const binningSlider = sliders[2]
    expect(binningSlider).toHaveAccessibleName("V3.Inspector.map.hotSpotColorBinning")
    expect(highSwatch().compareDocumentPosition(binningSlider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("commits the color bins from the color binning slider", async () => {
    const user = userEvent.setup()
    const hotSpotModel = mountShownHotSpot()
    expect(hotSpotModel.colorBins).toBe("continuous")
    const slider = screen.getByRole("slider", { name: "V3.Inspector.map.hotSpotColorBinning" })
    act(() => slider.focus())
    await user.keyboard("{Home}")
    expect(hotSpotModel.colorBins).toBe(2)
  })
```

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx`
Expected: FAIL in the two new tests: there are 2 sliders, not 3, and no slider has the binning name.

**Step 3: Render the slider**

In `map-hot-spot-control.tsx`, add the import (keep the imports in alphabetical order by path):

```ts
import { MapHotSpotBinningSlider } from "./map-hot-spot-binning-slider"
```

and render it after the high color row:

```tsx
      {renderCustomColorRow("Low", lowColor)}
      {renderCustomColorRow("High", highColor)}
      <MapHotSpotBinningSlider mapPointLayerModel={mapPointLayerModel}/>
```

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/components/inspector-panel`
Expected: PASS, all files in the folder.

**Step 5: Style the readout**

In `map-inspector.scss`, inside `.map-hot-spot-controls`, after the `.slider-row` rule, add:

```scss
        .slider-readout {
          margin-top: 2px;
          text-align: right;
          font-size: 12px;
          color: vars.$charcoal;
        }

        .react-aria-Slider[data-disabled] .slider-readout {
          opacity: 0.5;
        }
```

These values are a starting point, to be checked in the browser in Task 9. Before settling them:
- See how `inspector-panel.scss` (around the `[data-disabled]` rules) dims a disabled slider and its label. If
  it already dims the whole `.react-aria-Slider`, delete the second rule so the readout isn't dimmed twice.
- `vars.$charcoal` is `#707070`, which has a contrast of about 4.9:1 on white, above the 4.5:1 that WCAG AA
  asks of small text. Don't pick a lighter color.

**Step 6: Commit**

```bash
git add v3/src/components/map/components/inspector-panel/map-hot-spot-control.tsx \
  v3/src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx \
  v3/src/components/map/components/inspector-panel/map-inspector.scss
git commit -m "Show the color binning slider in the hot spot controls."
```

---

### Task 9: Verify

**Step 1: Type check, lint and test**

Run each from `v3/`:

```bash
npm run build:tsc
npm run lint
npm test -- src/components/map src/v2
```

Expected: no type errors, no lint errors or warnings, all tests pass.

**Step 2: Check in the browser**

Start the app with `npm start` and turn on the `mapHotSpot` feature flag. See `v3/src/models/feature-flags/`
and `v3/docs/feature-flags.md` for how flags are set locally. Open a document with a map of points (Roller
Coasters works), open the map's layers palette, and check Hot spot. Then check each of these:

| Check | Expected |
| --- | --- |
| Position | "Color binning" is the last control, below High color |
| Default | Thumb at the far right; readout "continuous", right-justified below the slider; the map looks as it did before this feature |
| Drag left | The map redraws as the thumb moves; the readout counts down "10 classes" to "2 classes" |
| 2 classes | Only the densest half of the density range is drawn, in the solid high color |
| 3 classes with Monochrome | Two visible bands: gray, then white at the densest |
| 10 classes | The lowest visible bands are faint, as the design's "Consequences of the fade" describes |
| Each color ramp | The densest band is the ramp's high color |
| Undo, redo | One drag is one undo step, named "Undo changing hot spot color binning" |
| Keyboard | Arrow keys step by one class; Home goes to 2; End goes to continuous |
| Hot spot unchecked | The slider and readout are disabled and dimmed like the other controls |
| Save and reopen | The binning is restored, both as a number and as continuous |
| Screen reader (VoiceOver: Cmd-F5) | Moving the slider announces "5 classes" or "continuous", once |
| Pan and zoom | The bands stay attached to the same places on the map |

**Step 3: Report**

Tell the user what passed and what did not, with the output of any failing command. Do not create the pull
request until they ask; `CLAUDE.md` describes that workflow.

### Not in this plan

- **Log event dictionary.** The `changeHotSpotColorBinning` event is not added to
  `codap-v3-log-events.csv`. The other hot spot events aren't in it either while the feature is behind its
  flag; the `generate-log-events-csv` skill picks them all up when it is next run.
- Everything under "Out of scope" in the design.
