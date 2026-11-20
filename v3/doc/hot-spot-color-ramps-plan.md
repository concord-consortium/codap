# Hot Spot Color Ramps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let the user choose the hot spot layer's color ramp (Heat, Viridis, Cividis, Monochrome or Custom) in
the map's layers palette, with the custom ramp interpolated in CIELAB.

**Architecture:** A new module, `hot-spot-color-ramps.ts`, maps a ramp name plus the low and high colors to a d3
interpolator. `buildColorLUT` samples that interpolator instead of two colors. `MapHotSpotModel` stores the ramp
name in a new `colorRamp` property, and `MapHotSpotControl` gets a react-aria `Select` and two
`PointColorSetting` rows.

**Tech Stack:** TypeScript, React 18, MobX-State-Tree, react-aria-components, d3 (`interpolateLab`,
`interpolateRgb`, `interpolateInferno`, `interpolateViridis`, `interpolateCividis`, `rgb`), Jest with React
Testing Library.

**Design:** [hot-spot-color-ramps-design.md](hot-spot-color-ramps-design.md)

---

## Before you start

- Branch: `codap-1645-hot-spot-colors` (already created from `main`).
- Run `npm` commands from `v3/`. Run `git` commands from the repository root.
- Run one test file with `npm test -- <path relative to v3>`.
- Code style: no semicolons, double quotes, lines of at most 120 characters.
- **Commits:** `CLAUDE.md` requires showing each commit message to the user and getting approval before
  committing. The messages below are proposals.
- The feature is behind the `mapHotSpot` feature flag. Component tests turn it on with
  `featureFlagManager.setServerConfig({ mapHotSpot: "on" })`.
- Tests mock `t()` to return its key, so they look up elements by translation key.

---

### Task 1: Color ramp module

**Files:**
- Create: `v3/src/components/map/utilities/hot-spot-color-ramps.ts`
- Create: `v3/src/components/map/utilities/hot-spot-color-ramps.test.ts`

**Step 1: Write the failing tests**

```ts
import {
  getHotSpotRampGradient, getHotSpotRampInterpolator, HotSpotColorRamps, isHotSpotColorRamp,
  kDefaultHotSpotColorRamp, kDefaultHotSpotHighColor, kDefaultHotSpotLowColor
} from "./hot-spot-color-ramps"

describe("hot spot color ramps", () => {
  const low = kDefaultHotSpotLowColor, high = kDefaultHotSpotHighColor

  it("lists the ramps in menu order, with heat as the default", () => {
    expect(HotSpotColorRamps).toEqual(["heat", "viridis", "cividis", "monochrome", "custom"])
    expect(kDefaultHotSpotColorRamp).toBe("heat")
    expect(low).toBe("#fff3a3")
    expect(high).toBe("#5b1a8c")
  })

  it("recognizes ramp names", () => {
    expect(isHotSpotColorRamp("viridis")).toBe(true)
    expect(isHotSpotColorRamp("rainbow")).toBe(false)
    expect(isHotSpotColorRamp(undefined)).toBe(false)
  })

  it("uses d3's inferno for heat", () => {
    const heat = getHotSpotRampInterpolator("heat", low, high)
    expect([heat(0), heat(0.5), heat(1)]).toEqual(["#000004", "#bc3754", "#fcffa4"])
  })

  it("uses d3's viridis and cividis", () => {
    const viridis = getHotSpotRampInterpolator("viridis", low, high)
    expect([viridis(0), viridis(0.5), viridis(1)]).toEqual(["#440154", "#21918c", "#fde725"])
    const cividis = getHotSpotRampInterpolator("cividis", low, high)
    expect([cividis(0), cividis(1)]).toEqual(["rgb(0, 32, 81)", "rgb(253, 234, 69)"])
  })

  it("runs from black to white for monochrome, ignoring the custom colors", () => {
    const monochrome = getHotSpotRampInterpolator("monochrome", low, high)
    expect([monochrome(0), monochrome(128 / 255), monochrome(1)])
      .toEqual(["rgb(0, 0, 0)", "rgb(128, 128, 128)", "rgb(255, 255, 255)"])
  })

  it("interpolates the custom ramp in CIELAB, not RGB", () => {
    const custom = getHotSpotRampInterpolator("custom", low, high)
    expect(custom(0)).toBe("rgb(255, 243, 163)")
    expect(custom(1)).toBe("rgb(91, 26, 140)")
    // the RGB midpoint would be rgb(173, 135, 152)
    expect(custom(0.5)).toBe("rgb(178, 133, 156)")
    // the RGB midpoint of blue and yellow would be gray
    expect(getHotSpotRampInterpolator("custom", "#0000ff", "#ffff00")(0.5)).toBe("rgb(193, 137, 172)")
  })

  it("interpolates the custom ramp's alpha linearly", () => {
    expect(getHotSpotRampInterpolator("custom", "#ff000000", "#ff0000ff")(0.5)).toBe("rgba(255, 0, 0, 0.5)")
  })

  it("builds a CSS gradient for a preview strip", () => {
    expect(getHotSpotRampGradient("monochrome", low, high, 3))
      .toBe("linear-gradient(to right, rgb(0, 0, 0), rgb(128, 128, 128), rgb(255, 255, 255))")
    const heat = getHotSpotRampGradient("heat", low, high)
    expect(heat.startsWith("linear-gradient(to right, #000004, ")).toBe(true)
    expect(heat.endsWith(", #fcffa4)")).toBe(true)
    expect(heat.match(/#/g)).toHaveLength(9)
  })
})
```

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/utilities/hot-spot-color-ramps.test.ts`
Expected: FAIL, "Cannot find module './hot-spot-color-ramps'".

**Step 3: Write the implementation**

```ts
import { interpolateCividis, interpolateInferno, interpolateLab, interpolateRgb, interpolateViridis } from "d3"

/** The hot spot color ramps, in the order the palette's menu lists them */
export const HotSpotColorRamps = ["heat", "viridis", "cividis", "monochrome", "custom"] as const
export type HotSpotColorRamp = typeof HotSpotColorRamps[number]

export const kDefaultHotSpotColorRamp: HotSpotColorRamp = "heat"
/** The default ends of the custom ramp */
export const kDefaultHotSpotLowColor = "#fff3a3"
export const kDefaultHotSpotHighColor = "#5b1a8c"

export function isHotSpotColorRamp(value: unknown): value is HotSpotColorRamp {
  return HotSpotColorRamps.includes(value as HotSpotColorRamp)
}

/** Maps a position in [0, 1], from low density to high, to a CSS color string */
export type ColorInterpolator = (t: number) => string

const kMonochromeInterpolator = interpolateRgb("#000000", "#ffffff")

/**
 * Returns the ramp's colors. Only the custom ramp uses lowColor and highColor. It is linear in CIELAB, so equal
 * steps along it look about equally different, and its alpha is linear.
 */
export function getHotSpotRampInterpolator(
  colorRamp: HotSpotColorRamp, lowColor: string, highColor: string
): ColorInterpolator {
  switch (colorRamp) {
    case "heat": return interpolateInferno
    case "viridis": return interpolateViridis
    case "cividis": return interpolateCividis
    case "monochrome": return kMonochromeInterpolator
    case "custom": return interpolateLab(lowColor, highColor)
  }
}

export const kRampGradientStops = 9

/** Returns a CSS linear-gradient of the ramp, running left to right, for a preview strip */
export function getHotSpotRampGradient(
  colorRamp: HotSpotColorRamp, lowColor: string, highColor: string, stops = kRampGradientStops
) {
  const interpolator = getHotSpotRampInterpolator(colorRamp, lowColor, highColor)
  const colors = Array.from({ length: stops }, (_, i) => interpolator(i / (stops - 1)))
  return `linear-gradient(to right, ${colors.join(", ")})`
}
```

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/utilities/hot-spot-color-ramps.test.ts`
Expected: PASS, 8 tests.

If the `switch` gives a TypeScript "not all code paths return a value" error, the union is not exhaustive: check
that `HotSpotColorRamps` is declared `as const`.

**Step 5: Commit**

```bash
git add v3/src/components/map/utilities/hot-spot-color-ramps.ts \
  v3/src/components/map/utilities/hot-spot-color-ramps.test.ts
git commit -m "CODAP-1645: add hot spot color ramp interpolators"
```

---

### Task 2: `buildColorLUT` takes an interpolator

**Files:**
- Modify: `v3/src/components/map/utilities/hot-spot-utils.ts` (imports at the top; `buildColorLUT`, about
  lines 311-327)
- Modify: `v3/src/components/map/utilities/hot-spot-utils.test.ts` (`describe("buildColorLUT")`, about line 309,
  and any other `buildColorLUT(` call in the file)
- Modify: `v3/src/components/map/components/map-hot-spot-layer.tsx` (the one `buildColorLUT` call, about line 69)

**Step 1: Update the tests**

In `hot-spot-utils.test.ts`, add this import:

```ts
import { getHotSpotRampInterpolator } from "./hot-spot-color-ramps"
```

Find every call with `grep -n "buildColorLUT(" src/components/map/utilities/hot-spot-utils.test.ts`. Replace each
as follows, leaving the assertions unchanged:

| Old | New |
| --- | --- |
| `buildColorLUT("#000000", "#ffffff")` | `buildColorLUT(getHotSpotRampInterpolator("monochrome", "", ""))` |
| `buildColorLUT("#ff000000", "#ff0000ff")` | `buildColorLUT(getHotSpotRampInterpolator("custom", "#ff000000", "#ff0000ff"))` |
| `buildColorLUT(a, b)` with other colors | `buildColorLUT(getHotSpotRampInterpolator("custom", a, b))` |

Add this test to `describe("buildColorLUT")`:

```ts
  it("samples a named ramp from end to end", () => {
    const lut = buildColorLUT(getHotSpotRampInterpolator("heat", "", ""))
    // #000004, fully faded
    expect(rgbaAt(lut, 0)).toEqual([0, 0, 4, 0])
    // #fcffa4
    expect(rgbaAt(lut, 255)).toEqual([252, 255, 164, 255])
  })
```

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/utilities/hot-spot-utils.test.ts`
Expected: FAIL. The `buildColorLUT` tests fail (TypeScript: expected 2 arguments, got 1).

**Step 3: Change `buildColorLUT`**

In `hot-spot-utils.ts`, remove the `getChoroplethColors` import, and add:

```ts
import { rgb } from "d3"
import { ColorInterpolator } from "./hot-spot-color-ramps"
```

Replace `buildColorLUT` and its comment:

```ts
/**
 * Returns a lookup table of kColorLUTSize RGBA colors (4 bytes each) sampled along the ramp, from low density to
 * high. Each entry's alpha is multiplied by hotSpotFade of its normalized density, so low densities fade to
 * transparent. Binning would plug in here.
 */
export function buildColorLUT(interpolator: ColorInterpolator) {
  const lut = new Uint8ClampedArray(kColorLUTSize * 4)
  for (let i = 0; i < kColorLUTSize; i++) {
    const normalizedDensity = i / (kColorLUTSize - 1)
    const { r, g, b, opacity } = rgb(interpolator(normalizedDensity))
    // Uint8ClampedArray rounds the alpha
    lut.set([r, g, b, opacity * hotSpotFade(normalizedDensity) * 255], i * 4)
  }
  return lut
}
```

**Step 4: Keep the layer compiling**

In `map-hot-spot-layer.tsx`, add the import and replace the `buildColorLUT` call. Task 4 replaces this line again.

```ts
import { getHotSpotRampInterpolator } from "../utilities/hot-spot-color-ramps"
```

```ts
      const lut = buildColorLUT(
        getHotSpotRampInterpolator("custom", hotSpotModel.lowColor, hotSpotModel.highColor))
```

**Step 5: Run the tests and the type check**

Run: `npm test -- src/components/map/utilities/hot-spot-utils.test.ts`
Expected: PASS.

Run: `npm run build:tsc`
Expected: no errors.

**Step 6: Commit**

```bash
git add v3/src/components/map/utilities/hot-spot-utils.ts v3/src/components/map/utilities/hot-spot-utils.test.ts \
  v3/src/components/map/components/map-hot-spot-layer.tsx
git commit -m "CODAP-1645: build the hot spot color table from an interpolator"
```

---

### Task 3: Model property and defaults

**Files:**
- Modify: `v3/src/components/map/models/map-hot-spot-model.ts`
- Modify: `v3/src/components/map/models/map-hot-spot-model.test.ts`
- Modify: `v3/src/v2/codap-v2-types.ts` (`ICodapV2MapHotSpotStorage`, about line 547)
- Modify: `v3/src/components/map/v2-map-importer.test.ts` ("round-trips non-default display properties", about
  line 275)

**Step 1: Update the tests**

In `map-hot-spot-model.test.ts`:

In "has defaults for the density display", replace the two color expectations:

```ts
    expect(hotSpot.colorRamp).toBe("heat")
    expect(hotSpot.lowColor).toBe("#fff3a3")
    expect(hotSpot.highColor).toBe("#5b1a8c")
```

In "is not default when a display property differs", add:

```ts
    expect(isDefaultHotSpotModel(MapHotSpotModel.create({ colorRamp: "viridis" }))).toBe(false)
```

In "can set the display properties", add `hotSpot.setColorRamp("custom")` after `setOpacity`, and change the
expected snapshot to:

```ts
    expect(getSnapshot(hotSpot)).toEqual({
      isVisible: false, bandwidth: 5000, opacity: 0.5, colorRamp: "custom", lowColor: "#0000ff", highColor: "#ff0000"
    })
```

In `v2-map-importer.test.ts`, in "round-trips non-default display properties", change the `hotSpot` constant to:

```ts
    const hotSpot = {
      isVisible: true, bandwidth: 5000, opacity: 0.5, colorRamp: "custom", lowColor: "#0000ff", highColor: "#ff0000"
    }
```

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/models/map-hot-spot-model.test.ts src/components/map/v2-map-importer.test.ts`
Expected: FAIL. `colorRamp` is undefined, `setColorRamp` is not a function, and the default colors are black and
white.

**Step 3: Update the model**

In `map-hot-spot-model.ts`, add the import:

```ts
import {
  HotSpotColorRamp, HotSpotColorRamps, kDefaultHotSpotColorRamp, kDefaultHotSpotHighColor, kDefaultHotSpotLowColor
} from "../utilities/hot-spot-color-ramps"
```

Replace the `lowColor` and `highColor` properties:

```ts
  colorRamp: types.optional(types.enumeration([...HotSpotColorRamps]), kDefaultHotSpotColorRamp),
  lowColor: kDefaultHotSpotLowColor,
  highColor: kDefaultHotSpotHighColor
```

Add the action before `setLowColor`:

```ts
    setColorRamp(colorRamp: HotSpotColorRamp) {
      self.colorRamp = colorRamp
    },
```

**Step 4: Update the v2 storage type**

In `codap-v2-types.ts`, add to `ICodapV2MapHotSpotStorage`, after `opacity`:

```ts
  colorRamp?: "heat" | "viridis" | "cividis" | "monochrome" | "custom"
```

The literal union is written out so this types file doesn't import from the map component. If `npm run build:tsc`
reports that the importer's `hotSpotModel: v2LayerModel.v3?.hotSpot` is not assignable, the union and
`HotSpotColorRamps` have drifted apart.

**Step 5: Run the tests and the type check**

Run: `npm test -- src/components/map/models src/components/map/v2-map-importer.test.ts`
Expected: PASS.

Run: `npm run build:tsc`
Expected: no errors.

**Step 6: Commit**

```bash
git add v3/src/components/map/models/map-hot-spot-model.ts v3/src/components/map/models/map-hot-spot-model.test.ts \
  v3/src/v2/codap-v2-types.ts v3/src/components/map/v2-map-importer.test.ts
git commit -m "CODAP-1645: add colorRamp to the hot spot model"
```

---

### Task 4: Draw the layer with the chosen ramp

**Files:**
- Modify: `v3/src/components/map/components/map-hot-spot-layer.tsx` (the reaction, about line 57, and the
  `buildColorLUT` call, about line 69)
- Modify: `v3/src/components/map/components/map-hot-spot-layer.test.tsx`

**Step 1: Read the existing test file**

Read `map-hot-spot-layer.test.tsx` from the top to learn how it renders the layer (its `beforeEach`, its Leaflet
map setup and its helper for rendering). The new test must use the same setup.

**Step 2: Write the failing test**

At the top of the test file, mock the ramp module so the test can see what the layer asks for. Keep the real
implementation:

```ts
import * as colorRamps from "../utilities/hot-spot-color-ramps"

jest.mock("../utilities/hot-spot-color-ramps", () => {
  const actual = jest.requireActual("../utilities/hot-spot-color-ramps")
  return { ...actual, getHotSpotRampInterpolator: jest.fn(actual.getHotSpotRampInterpolator) }
})
```

Add this test, replacing the two commented lines with the file's existing way of rendering a shown hot spot (copy
it from "applies the hot spot opacity to the canvas") and of waiting for the debounced redraw. The redraw is
debounced by 10 ms, so use fake timers (`jest.useFakeTimers()` and `act(() => jest.advanceTimersByTime(20))`) if
the file already does, or `await waitFor(...)` if it doesn't.

```ts
  it("redraws with the model's color ramp when it changes", async () => {
    const getInterpolator = colorRamps.getHotSpotRampInterpolator as jest.Mock
    // render the layer with the hot spot shown and at least one point, as the opacity test does
    getInterpolator.mockClear()

    act(() => mapPointLayerModel.hotSpotModel.setColorRamp("viridis"))
    // wait for the debounced redraw
    await waitFor(() => expect(getInterpolator).toHaveBeenCalledWith("viridis", "#fff3a3", "#5b1a8c"))
  })
```

The draw function returns early when there is no surface, so the layer needs points for this test. If the
existing tests render without points, give the model a `latLongSource` first, as `map-hot-spot-model.test.ts`
does in "uses the source's points":

```ts
    mapPointLayerModel.hotSpotModel.setLatLongSource({ plottedLatLongs: [{ lat: 0, long: 0 }] } as any)
```

jsdom's canvas has no 2D context unless the file mocks one. If `canvas.getContext("2d")` returns null in this
file's setup, the draw function is never called. In that case, mock it in this test:

```ts
    const context = { createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: jest.fn() }
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as any)
```

**Step 3: Run the test to verify it fails**

Run: `npm test -- src/components/map/components/map-hot-spot-layer.test.tsx`
Expected: FAIL. `getHotSpotRampInterpolator` was called with `"custom"`, or not called again after the ramp
changed.

**Step 4: Update the layer**

In `map-hot-spot-layer.tsx`, change the reaction's data function:

```ts
      () => [hotSpotModel.hotSpotSurface, hotSpotModel.colorRamp, hotSpotModel.lowColor, hotSpotModel.highColor],
```

and the `buildColorLUT` call:

```ts
      const { colorRamp, lowColor, highColor } = hotSpotModel
      const lut = buildColorLUT(getHotSpotRampInterpolator(colorRamp, lowColor, highColor))
```

**Step 5: Run the tests to verify they pass**

Run: `npm test -- src/components/map/components/map-hot-spot-layer.test.tsx`
Expected: PASS, all tests including the existing ones.

**Step 6: Commit**

```bash
git add v3/src/components/map/components/map-hot-spot-layer.tsx \
  v3/src/components/map/components/map-hot-spot-layer.test.tsx
git commit -m "CODAP-1645: draw hot spots with the chosen color ramp"
```

---

### Task 5: Strings

**Files:**
- Modify: `v3/src/utilities/translation/lang/en-US.json5` (about lines 1392 and 1463)

**Step 1: Add the inspector strings**

After `"V3.Inspector.map.hotSpotOpacity": "Opacity",`:

```json5
    "V3.Inspector.map.hotSpotColorRamp": "Color",
    "V3.Inspector.map.hotSpotColorRamp.heat": "Heat",
    "V3.Inspector.map.hotSpotColorRamp.viridis": "Viridis",
    "V3.Inspector.map.hotSpotColorRamp.cividis": "Cividis",
    "V3.Inspector.map.hotSpotColorRamp.monochrome": "Monochrome",
    "V3.Inspector.map.hotSpotColorRamp.custom": "Custom",
    "V3.Inspector.map.hotSpotLowColor": "Low color",
    "V3.Inspector.map.hotSpotHighColor": "High color",
```

**Step 2: Add the undo and redo strings**

After `"V3.Redo.map.changeHotSpotOpacity": "Redo changing hot spot opacity",`:

```json5
    "V3.Undo.map.changeHotSpotColorRamp": "Undo changing hot spot color",
    "V3.Redo.map.changeHotSpotColorRamp": "Redo changing hot spot color",
    "V3.Undo.map.changeHotSpotLowColor": "Undo changing hot spot low color",
    "V3.Redo.map.changeHotSpotLowColor": "Redo changing hot spot low color",
    "V3.Undo.map.changeHotSpotHighColor": "Undo changing hot spot high color",
    "V3.Redo.map.changeHotSpotHighColor": "Redo changing hot spot high color",
```

**Step 3: Verify the file still parses**

Run: `npm test -- translate`
Expected: PASS.

No commit yet. These strings are committed with Task 6, which uses them.

---

### Task 6: Palette controls

**Files:**
- Modify: `v3/src/components/map/components/inspector-panel/map-hot-spot-control.tsx`
- Modify: `v3/src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx`
- Modify: `v3/src/components/map/components/inspector-panel/map-inspector.scss` (`.map-hot-spot-controls`, about
  line 92; the popover rule goes at the top level of the file)

**Background**

- `PointColorSetting` (`v3/src/components/data-display/inspector/point-color-setting.tsx`) is the Fill Color
  swatch. It renders a button with `data-testid="color-swatch-button-{testIdSuffix}"` and
  `aria-label="{propertyLabel}: {color}"`, and calls `onColorChange` with each color the user tries.
  `plot-background-controls.tsx` shows the row markup to copy, including its disabled state.
- `legend-color-controls.tsx` (`LegendBinsSelect`, about line 358) is the model for a react-aria `Select` in a
  palette, and `legend-color-controls.test.tsx` (`describe("LegendBinsSelect")`, about line 236) shows how to
  test one.
- react-aria's `SelectValue` renders the selected item's children by default, so the selected option's preview
  strip appears in the closed button without extra code.
- react-aria's `Popover` renders in a portal outside the palette, so its styles can't be nested under
  `.map-hot-spot-controls`.

**Step 1: Write the failing tests**

Add to `describe("MapHotSpotControl")` in `map-hot-spot-control.test.tsx`:

```tsx
  function renderShownHotSpot() {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    pointLayer.hotSpotModel.setIsVisible(true)
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)
    return pointLayer.hotSpotModel
  }
  const rampButton = () => screen.getByTestId("map-hot-spot-color-ramp-button")
  const lowSwatch = () => screen.getByTestId("color-swatch-button-hot-spot-low")
  const highSwatch = () => screen.getByTestId("color-swatch-button-hot-spot-high")

  it("shows the selected color ramp with its preview strip", () => {
    renderShownHotSpot()
    expect(rampButton()).toHaveTextContent("V3.Inspector.map.hotSpotColorRamp.heat")
    const strip = rampButton().querySelector<HTMLElement>(".hot-spot-ramp-strip")
    expect(strip).toHaveAttribute("aria-hidden", "true")
    expect(strip?.style.getPropertyValue("--hot-spot-ramp")).toMatch(/^linear-gradient\(to right, #000004, /)
  })

  it("lists the color ramps in order, each with a preview strip", async () => {
    const user = userEvent.setup()
    renderShownHotSpot()
    await user.click(rampButton())
    const options = screen.getAllByRole("option")
    expect(options.map(option => option.textContent)).toEqual(
      ["heat", "viridis", "cividis", "monochrome", "custom"].map(ramp => `V3.Inspector.map.hotSpotColorRamp.${ramp}`))
    options.forEach(option => expect(option.querySelector(".hot-spot-ramp-strip")).toBeInTheDocument())
  })

  it("changes the color ramp", async () => {
    const user = userEvent.setup()
    const hotSpotModel = renderShownHotSpot()
    await user.click(rampButton())
    await user.click(screen.getByRole("option", { name: "V3.Inspector.map.hotSpotColorRamp.viridis" }))
    expect(hotSpotModel.colorRamp).toBe("viridis")
    expect(rampButton()).toHaveTextContent("V3.Inspector.map.hotSpotColorRamp.viridis")
  })

  it("disables the color ramp menu while the hot spot is hidden", () => {
    featureFlagManager.setServerConfig({ mapHotSpot: "on" })
    const pointLayer = MapPointLayerModel.create(undefined, { historyService: new AppHistoryService() })
    render(<MapHotSpotControl mapPointLayerModel={pointLayer}/>)
    expect(rampButton()).toBeDisabled()
    expect(lowSwatch()).toBeDisabled()
    expect(highSwatch()).toBeDisabled()
  })

  it("enables the low and high colors only for the custom ramp", () => {
    const hotSpotModel = renderShownHotSpot()
    expect(lowSwatch()).toBeDisabled()
    expect(highSwatch()).toBeDisabled()
    act(() => hotSpotModel.setColorRamp("custom"))
    expect(lowSwatch()).toBeEnabled()
    expect(highSwatch()).toBeEnabled()
    expect(lowSwatch()).toHaveAccessibleName("V3.Inspector.map.hotSpotLowColor: #fff3a3")
    expect(highSwatch()).toHaveAccessibleName("V3.Inspector.map.hotSpotHighColor: #5b1a8c")
  })

  it("shows the custom colors in the custom ramp's preview strip", () => {
    const hotSpotModel = renderShownHotSpot()
    act(() => {
      hotSpotModel.setColorRamp("custom")
      hotSpotModel.setLowColor("#000000")
    })
    const strip = rampButton().querySelector<HTMLElement>(".hot-spot-ramp-strip")
    expect(strip?.style.getPropertyValue("--hot-spot-ramp")).toMatch(/^linear-gradient\(to right, rgb\(0, 0, 0\), /)
  })
```

Changing a color through the picker is not tested here. `point-color-setting.test.tsx` covers the picker, and the
handlers that connect it to the model are checked in the browser in Task 7.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx`
Expected: FAIL, "Unable to find an element by: [data-testid="map-hot-spot-color-ramp-button"]".

**Step 3: Write the component**

Replace `map-hot-spot-control.tsx` with:

```tsx
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import {
  Button, Key, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, Slider, SliderThumb, SliderTrack
} from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { isFeatureEnabled } from "../../../../models/feature-flags/feature-flag-manager"
import { t } from "../../../../utilities/translation/translate"
import { PointColorSetting } from "../../../data-display/inspector/point-color-setting"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { IMapPointLayerModel } from "../../models/map-point-layer-model"
import {
  getHotSpotRampGradient, HotSpotColorRamp, HotSpotColorRamps, isHotSpotColorRamp
} from "../../utilities/hot-spot-color-ramps"

// Announce the opacity to screen readers as a percentage (e.g. "75%") rather than a raw fraction
const kOpacityFormatOptions: Intl.NumberFormatOptions = { style: "percent" }

interface IProps {
  mapPointLayerModel?: IMapPointLayerModel
}

export const MapHotSpotControl = observer(function MapHotSpotControl({ mapPointLayerModel }: IProps) {
  if (!mapPointLayerModel || !isFeatureEnabled("mapHotSpot")) return null

  const { hotSpotModel } = mapPointLayerModel
  const { colorRamp, lowColor, highColor, isVisible } = hotSpotModel
  const datasetName = mapPointLayerModel.dataConfiguration.dataset?.name
  const customColorsDisabled = !isVisible || colorRamp !== "custom"

  const handleIsVisibleChange = (checked: boolean) => {
    const op = checked ? "show" : "hide"
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setIsVisible(checked)
    }, {
      undoStringKey: `V3.Undo.map.${op}HotSpot`,
      redoStringKey: `V3.Redo.map.${op}HotSpot`,
      log: logStringifiedObjectMessage("mapAction: %@", { mapAction: `${op}HotSpot`, dataset: datasetName })
    })
  }

  const handleOpacityChangeEnd = (opacity: number) => {
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setOpacity(opacity)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotOpacity",
      redoStringKey: "V3.Redo.map.changeHotSpotOpacity",
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: "changeHotSpotOpacity", opacity, dataset: datasetName })
    })
  }

  const handleColorRampChange = (key: Key | null) => {
    if (!isHotSpotColorRamp(key) || key === colorRamp) return
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setColorRamp(key)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotColorRamp",
      redoStringKey: "V3.Redo.map.changeHotSpotColorRamp",
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: "changeHotSpotColorRamp", colorRamp: key, dataset: datasetName })
    })
  }

  const handleCustomColorChange = (end: "Low" | "High", color: string) => {
    hotSpotModel.applyModelChange(() => {
      end === "Low" ? hotSpotModel.setLowColor(color) : hotSpotModel.setHighColor(color)
    }, {
      undoStringKey: `V3.Undo.map.changeHotSpot${end}Color`,
      redoStringKey: `V3.Redo.map.changeHotSpot${end}Color`,
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: `changeHotSpot${end}Color`, color, dataset: datasetName })
    })
  }

  // The strip is decorative: the option's text is its accessible name.
  // The gradient is a custom property, like the color swatch's --swatch-color.
  const renderRamp = (ramp: HotSpotColorRamp) => (
    <>
      <span className="hot-spot-ramp-strip" aria-hidden="true"
        style={{ "--hot-spot-ramp": getHotSpotRampGradient(ramp, lowColor, highColor) } as React.CSSProperties}/>
      {t(`V3.Inspector.map.hotSpotColorRamp.${ramp}`)}
    </>
  )

  const renderCustomColorRow = (end: "Low" | "High", color: string) => {
    const label = t(`V3.Inspector.map.hotSpot${end}Color`)
    return (
      <div
        className={clsx("palette-row", "color-picker-row", { disabled: customColorsDisabled })}
        aria-disabled={customColorsDisabled || undefined}
      >
        <label className="form-label color-picker">{label}</label>
        <PointColorSetting
          propertyLabel={label}
          testIdSuffix={`hot-spot-${end.toLowerCase()}`}
          disabled={customColorsDisabled}
          onColorChange={newColor => handleCustomColorChange(end, newColor)}
          swatchBackgroundColor={color}
        />
      </div>
    )
  }

  return (
    <div className="map-hot-spot-controls palette-form">
      <PaletteCheckbox
        data-testid="map-layers-checkbox-hot-spot"
        isSelected={isVisible}
        onChange={handleIsVisibleChange}
      >
        {t("V3.Inspector.map.hotSpot")}
      </PaletteCheckbox>
      <Slider
        minValue={0}
        maxValue={1}
        step={0.01}
        formatOptions={kOpacityFormatOptions}
        value={hotSpotModel.displayOpacity}
        onChange={(val: number) => hotSpotModel.setDynamicOpacity(val)}
        onChangeEnd={handleOpacityChangeEnd}
        isDisabled={!isVisible}
        data-testid="map-hot-spot-opacity-slider"
      >
        <div className="palette-row slider-row">
          <Label className="form-label">{t("V3.Inspector.map.hotSpotOpacity")}</Label>
          <SliderTrack>
            <SliderThumb />
          </SliderTrack>
        </div>
      </Slider>
      <Select
        className="react-aria-Select palette-row color-ramp-row"
        selectedKey={colorRamp}
        onSelectionChange={handleColorRampChange}
        isDisabled={!isVisible}
        data-testid="map-hot-spot-color-ramp-select"
      >
        <Label className="form-label">{t("V3.Inspector.map.hotSpotColorRamp")}</Label>
        <Button data-testid="map-hot-spot-color-ramp-button">
          <SelectValue />
          <span aria-hidden="true" className="select-arrow">▾</span>
        </Button>
        <Popover
          className="react-aria-Popover hot-spot-color-ramp-popover"
          data-testid="map-hot-spot-color-ramp-popover"
        >
          <ListBox>
            {HotSpotColorRamps.map(ramp =>
              <ListBoxItem key={ramp} id={ramp} textValue={t(`V3.Inspector.map.hotSpotColorRamp.${ramp}`)}>
                {renderRamp(ramp)}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </Select>
      {renderCustomColorRow("Low", lowColor)}
      {renderCustomColorRow("High", highColor)}
    </div>
  )
})
```

Notes:

- `LegendBinsSelect` uses `value` and `onChange` on `Select`. Use whichever pair the installed
  react-aria-components version accepts without a type error. `point-shape-setting.tsx` uses `selectedKey` and
  `onSelectionChange`, as above.
- Passing `className` replaces react-aria's default class, so `react-aria-Select` and `react-aria-Popover` are
  repeated to keep the shared palette styles.
- If the ESLint rule `codap/require-testid` asks for a `data-testid` on `ListBoxItem`, add
  ``data-testid={`map-hot-spot-color-ramp-option-${ramp}`}``.

**Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx`
Expected: PASS, all tests including the five that existed.

If the popover's options aren't found, look at how `describe("LegendBinsSelect")` opens its menu and do the same.

**Step 5: Add the styles**

In `map-inspector.scss`, inside `.map-hot-spot-controls`, after the `.slider-row` rule:

```scss
        .color-ramp-row {
          justify-content: space-between;
          height: auto;
          margin-top: 8px;

          .react-aria-Button {
            min-width: 140px;
          }

          .react-aria-SelectValue {
            display: flex;
            align-items: center;
            gap: 6px;
          }
        }

        .color-picker-row.disabled .form-label {
          opacity: 0.35;
        }
```

At the top level of the file, after the `.map-values-controls` rule:

```scss
// The preview strip of a hot spot color ramp, in the menu's button and in its options.
// Top-level because the menu's popover renders in a portal outside the palette.
.hot-spot-ramp-strip {
  flex: none;
  width: 40px;
  height: 12px;
  border: 1px solid vars.$charcoal-light-1;
  border-radius: 2px;
  background: var(--hot-spot-ramp);
}

.hot-spot-color-ramp-popover .react-aria-ListBoxItem {
  display: flex;
  align-items: center;
  gap: 6px;
}
```

Before keeping the `.color-picker-row.disabled .form-label` rule, check whether the shared styles already dim a
disabled color row: `grep -rn "color-picker-row" src --include=*.scss`. If they do, delete the rule. If the
shared rule uses a different opacity, use that value.

**Step 6: Lint and type check**

Run: `npm run lint -- src/components/map` then `npm run build:tsc`
Expected: no errors or warnings from the changed files.

**Step 7: Commit**

```bash
git add v3/src/components/map/components/inspector-panel/map-hot-spot-control.tsx \
  v3/src/components/map/components/inspector-panel/map-hot-spot-control.test.tsx \
  v3/src/components/map/components/inspector-panel/map-inspector.scss \
  v3/src/utilities/translation/lang/en-US.json5
git commit -m "CODAP-1645: add hot spot color ramp controls to the map layers palette"
```

---

### Task 7: Verify in the browser

**Step 1: Run the whole map test suite and the checks**

Run: `npm test -- src/components/map src/utilities/color-utils`
Expected: PASS.

Run: `npm run lint` then `npm run build:tsc`
Expected: no errors.

**Step 2: Start the app**

Run: `npm start`, then open the dev server's URL. Turn the `mapHotSpot` feature flag on. See
`v3/src/models/feature-flags/` for how flags are set locally (URL parameter or local storage).

Open a document with latitude and longitude data (for example, Roller Coasters from the example documents), add a
map, and open the map's layers palette.

**Step 3: Check each behavior**

| Check | Expected |
| --- | --- |
| Hot spot unchecked | Color menu and both swatches are disabled |
| Check Hot spot | The layer draws with Heat. The menu's button shows a strip and "Heat". Swatches stay disabled |
| Open the menu | Five options in order, each with a strip. Custom's strip runs pale yellow to purple |
| Choose Viridis, then Cividis, then Monochrome | The layer and the button's strip change each time. Monochrome matches the layer before this change |
| Choose Custom | The swatches become enabled. The layer runs pale yellow to purple |
| Pick a new low color | The layer and Custom's strip update as the color changes |
| Choose Heat, then Custom | The picked low color is still there |
| Undo and redo each change | Each steps back and forward. The Edit menu's undo text names the change |
| Save, close and reopen the document | The ramp and both colors are restored |
| Narrow palette | The Color row fits on one line, with nothing clipped |
| Keyboard | Tab reaches the menu and the enabled swatches. Arrow keys and Enter choose a ramp |

**Step 4: Fix anything that fails**

Fix it with a failing test first where the problem is testable, then commit.
