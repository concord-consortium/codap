# CODAP-1293 Legend Bin Count — Implementation Plan (Plan 1 of 2: V3 feature)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users change the number of bins (default 5) for a numeric legend via an integer spinner in the graph Format menu and map Layers menu, persisting per-attribute and re-splitting the legend colors accordingly.

**Architecture:** Store the per-attribute bin count in `AttributeScale` metadata (beside `legendMin`/`legendMax`/`binningType`), exactly mirroring the CODAP-1292 range work. Generalize the choropleth color ramp to return N interpolated colors; the existing `scaleQuantize`/`scaleQuantile` then derive N bins for free. A react-aria `NumberField` spinner drives the value, clamped to `[2, min(#points, #distinct)]`.

**Tech Stack:** React + TypeScript, MobX-State-Tree, D3 (`scaleQuantize`/`scaleQuantile`, color interpolation), react-aria-components, Jest + React Testing Library.

**Spec:** `v3/docs/plans/2026-06-04-codap-1293-legend-bin-count-design.md`

**Scope note:** This plan covers the V3-visible feature only. V2 import/export two-way mapping and removal of the dead `numberOfLegendQuantiles` field are **Plan 2** (separate, because they touch the v2 import/export layer for both graph and map and are coupled to the field removal). The new `numberOfBins` field added here is independent of and coexists with `numberOfLegendQuantiles` until Plan 2.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/models/shared/data-set-metadata.ts` | per-attribute legend scale metadata | Add `numberOfBins` to `AttributeScale`; add get/set accessors; include it in the empty-scale cleanup |
| `src/models/shared/data-set-metadata.test.ts` | model tests | New tests for the accessors + cleanup |
| `src/utilities/color-utils.ts` | color helpers | Generalize `getChoroplethColors` to take a `count` |
| `src/utilities/color-utils.test.ts` | color tests | New tests for N-color ramp |
| `src/components/data-display/models/data-configuration-model.ts` | legend scale construction | Add `legendBinCount` view (clamp); pass it to `getChoroplethColors` in `choroplethColors` |
| `src/components/graph/models/graph-data-configuration-model.test.ts` | scale tests | New tests for N-bin scales |
| `src/components/data-display/inspector/legend-color-controls.tsx` | inspector controls | New `LegendBinCountInput` (NumberField spinner) |
| `src/components/data-display/inspector/legend-color-controls.test.tsx` | UI tests | New tests for the spinner |
| `src/components/data-display/inspector/display-item-format-control.tsx` | inspector layout | Render `LegendBinCountInput` between bins select and range inputs |
| `src/components/data-display/inspector/display-item-format-control.scss` | inspector styles | Spinner styling + disabled state |
| `src/utilities/translation/lang/en-US.json5` | strings | `legendBinCount` label + undo/redo keys |

Run all `npm`/`jest`/`lint` commands from `/v3`. Run `git` from the repo root.

---

## Task 1: `numberOfBins` on `AttributeScale` + accessors

**Files:**
- Modify: `src/models/shared/data-set-metadata.ts`
- Test: `src/models/shared/data-set-metadata.test.ts`

Context: `AttributeScale` currently has `binningType`, `legendMin`, `legendMax`. There is a module-level helper `isAttributeScaleEmpty(scale)` and `setAttributeLegendMin/Max` actions that clear the scale node when it becomes empty. Mirror those exactly.

- [ ] **Step 1: Write failing tests**

Add to `data-set-metadata.test.ts` inside the existing `describe("DataSetMetadata", ...)` block (after the legend-range tests):

```ts
  it("stores a per-attribute legend bin count", () => {
    expect(tree.metadata.getAttributeNumberOfBins("aId")).toBeUndefined()
    tree.metadata.setAttributeNumberOfBins("aId", 8)
    expect(tree.metadata.getAttributeNumberOfBins("aId")).toBe(8)
  })

  it("clears the bin count and removes the scale node once it is empty", () => {
    tree.metadata.setAttributeNumberOfBins("aId", 8)
    expect(tree.metadata.attributes.get("aId")?.scale).toBeDefined()
    tree.metadata.setAttributeNumberOfBins("aId", undefined)
    expect(tree.metadata.getAttributeNumberOfBins("aId")).toBeUndefined()
    expect(tree.metadata.attributes.get("aId")?.scale).toBeUndefined()
  })

  it("does not create attribute metadata when clearing an unset bin count", () => {
    expect(tree.metadata.attributes.get("cId")).toBeUndefined()
    tree.metadata.setAttributeNumberOfBins("cId", undefined)
    expect(tree.metadata.attributes.get("cId")).toBeUndefined()
  })

  it("keeps the scale node when a bin count remains after clearing legend bounds", () => {
    tree.metadata.setAttributeNumberOfBins("aId", 8)
    tree.metadata.setAttributeLegendMin("aId", 5)
    tree.metadata.setAttributeLegendMin("aId", undefined)
    expect(tree.metadata.attributes.get("aId")?.scale).toBeDefined()
    expect(tree.metadata.getAttributeNumberOfBins("aId")).toBe(8)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- data-set-metadata`
Expected: FAIL — `getAttributeNumberOfBins`/`setAttributeNumberOfBins` are not functions.

- [ ] **Step 3: Add the model property**

In `data-set-metadata.ts`, add `numberOfBins` to `AttributeScale`:

```ts
const AttributeScale = types.model("AttributeScale", {
  binningType: types.maybe(types.enumeration(AttributeBinningTypes)),
  // user-specified overrides for the numeric legend range; undefined falls back to the data extent
  legendMin: types.maybe(types.number),
  legendMax: types.maybe(types.number),
  // user-specified number of legend bins; undefined falls back to the default (5)
  numberOfBins: types.maybe(types.number)
})
```

Update `isAttributeScaleEmpty` to include the new field:

```ts
function isAttributeScaleEmpty(scale?: Instance<typeof AttributeScale>) {
  return scale != null && scale.binningType == null && scale.legendMin == null &&
    scale.legendMax == null && scale.numberOfBins == null
}
```

- [ ] **Step 4: Add the view (getter)**

In the `.views(self => ({ ... }))` block where `getAttributeLegendMin`/`getAttributeLegendRange` live, add:

```ts
    getAttributeNumberOfBins(attrId: string) {
      return self.attributes.get(attrId)?.scale?.numberOfBins
    },
```

- [ ] **Step 5: Add the action (setter)**

In the `.actions(self => ({ ... }))` block where `setAttributeLegendMin`/`setAttributeLegendMax` live, add:

```ts
    setAttributeNumberOfBins(attrId: string, value?: number) {
      // avoid creating metadata just to clear a bin count that was never set
      if (value == null && self.attributes.get(attrId)?.scale == null) return
      const attrMetadata = self.requireAttributeMetadata(attrId)
      if (!attrMetadata.scale) {
        attrMetadata.scale = AttributeScale.create({ numberOfBins: value })
      } else {
        attrMetadata.scale.numberOfBins = value
        if (isAttributeScaleEmpty(attrMetadata.scale)) attrMetadata.scale = undefined
      }
    },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- data-set-metadata`
Expected: PASS (all, including the existing legend-range tests).

- [ ] **Step 7: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/models/shared/data-set-metadata.ts v3/src/models/shared/data-set-metadata.test.ts
git commit -m "CODAP-1293: add per-attribute numberOfBins to legend metadata"
```

---

## Task 2: Generalize `getChoroplethColors` to N colors

**Files:**
- Modify: `src/utilities/color-utils.ts`
- Test: `src/utilities/color-utils.test.ts` (create if absent)

Context: current implementation is hardcoded to 5 colors:
```ts
export function getChoroplethColors(color1: string, color2: string) {
  const midColor = (percentage: number) => interpolateColors(color1, color2, percentage)
  return [color1, midColor(.25), midColor(.5), midColor(.75), color2]
}
```
`interpolateColors(color1, color2, percentage)` already exists (line ~136).

- [ ] **Step 1: Write failing tests**

In `color-utils.test.ts` add (create the file with the import if it does not exist):

```ts
import { getChoroplethColors } from "./color-utils"

describe("getChoroplethColors", () => {
  it("defaults to five colors with the original endpoints", () => {
    const colors = getChoroplethColors("#000000", "#ffffff")
    expect(colors).toHaveLength(5)
    expect(colors[0]).toBe("#000000")
    expect(colors[4]).toBe("#ffffff")
  })

  it("returns the requested number of colors, endpoints included", () => {
    expect(getChoroplethColors("#000000", "#ffffff", 2)).toEqual(["#000000", "#ffffff"])
    const three = getChoroplethColors("#000000", "#ffffff", 3)
    expect(three).toHaveLength(3)
    expect(three[0]).toBe("#000000")
    expect(three[2]).toBe("#ffffff")
    expect(getChoroplethColors("#000000", "#ffffff", 7)).toHaveLength(7)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- color-utils`
Expected: FAIL — the 2-color and 7-color cases return 5 colors.

- [ ] **Step 3: Implement**

Replace `getChoroplethColors`:

```ts
// Returns `count` colors evenly interpolated between color1 and color2 (endpoints included).
// Defaults to five colors, preserving the original behavior for callers that don't pass a count.
export function getChoroplethColors(color1: string, color2: string, count = 5) {
  if (count <= 1) return [color1]
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? color1 : i === count - 1 ? color2 : interpolateColors(color1, color2, i / (count - 1)))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- color-utils`
Expected: PASS.

- [ ] **Step 5: Verify no caller regressed**

Run: `npm test -- choropleth-legend graph-data-configuration-model`
Expected: PASS (these render legends with the default 5 colors).

- [ ] **Step 6: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/utilities/color-utils.ts v3/src/utilities/color-utils.test.ts
git commit -m "CODAP-1293: support an arbitrary choropleth color count"
```

---

## Task 3: Effective bin count + wire `choroplethColors`

**Files:**
- Modify: `src/components/data-display/models/data-configuration-model.ts`
- Test: `src/components/graph/models/graph-data-configuration-model.test.ts`

Context: `choroplethColors` (a `.views` getter, ~line 521) calls `getChoroplethColors(self.lowColor, self.highColor)`. The number of colors equals the number of bins. The legend attribute's numeric values come from `self.numericValuesForAttrRole("legend")`.

Effective bin count = `clamp(numberOfBins ?? 5, 2, cap)` where `cap = min(#points, #distinct)`. If `cap < 2` (≤1 distinct value), the legend is degenerate — use 1 bin.

- [ ] **Step 1: Write failing tests**

Add to the `describe("DataConfigurationModel legend range overrides", ...)` block in `graph-data-configuration-model.test.ts` (its `beforeEach` already sets up a quantize legend on `legId` with values 0/10/20/40):

Note: the describe block's `beforeEach` seeds the legend with exactly 4 values (0/10/20/40), so the cap is 4. The default (5) therefore clamps to 4 — that *is* the designed "default clamps to cap" behavior, so test it explicitly, and add a separate case with ≥5 distinct values to verify the 5 default.

```ts
  it("defaults to the smaller of 5 and the distinct-value count", () => {
    // only 4 distinct legend values, so the default of 5 clamps to 4
    expect(tree.config.legendNumericColorScale.range().length).toBe(4)
  })

  it("uses 5 bins by default once there are at least 5 distinct values", () => {
    tree.data.addCases(toCanonical(tree.data, [
      { __id__: "c5", leg: 60 }, { __id__: "c6", leg: 80 }
    ]))
    expect(tree.config.legendNumericColorScale.range().length).toBe(5)
  })

  it("uses the per-attribute bin count for the number of legend bins", () => {
    tree.metadata.setAttributeNumberOfBins("legId", 3)
    expect(tree.config.legendNumericColorScale.range().length).toBe(3)
  })

  it("clamps the bin count to the number of distinct values", () => {
    // 4 distinct values -> cannot exceed 4 bins even if more are requested
    tree.metadata.setAttributeNumberOfBins("legId", 10)
    expect(tree.config.legendNumericColorScale.range().length).toBe(4)
  })

  it("floors the bin count at 2", () => {
    tree.metadata.setAttributeNumberOfBins("legId", 1)
    expect(tree.config.legendNumericColorScale.range().length).toBe(2)
  })
```

(`toCanonical` and `tree` are already imported/in scope in this test file.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- graph-data-configuration-model`
Expected: FAIL — all return 5 (the hardcoded color count).

- [ ] **Step 3: Add the `legendBinCount` view**

In `data-configuration-model.ts`, in the same `.views` block as `choroplethColors` (or just above it), add a view that computes the effective count. Place it before `choroplethColors` so the getter can call it:

```ts
    get legendBinCount() {
      const values = self.numericValuesForAttrRole("legend") ?? []
      const cap = Math.min(values.length, new Set(values).size)
      if (cap < 2) return 1 // degenerate: 0 or 1 distinct value
      const legendAttrId = self.attributeID("legend")
      const requested = self.metadata?.getAttributeNumberOfBins(legendAttrId) ?? 5
      return Math.max(2, Math.min(requested, cap))
    },
```

- [ ] **Step 4: Pass it to `getChoroplethColors`**

Change the `choroplethColors` getter:

```ts
    get choroplethColors() {
      return getChoroplethColors(self.lowColor, self.highColor, this.legendBinCount)
    }
```

(If `choroplethColors` and `legendBinCount` are in the same `.views(self => ({...}))` object, reference the sibling via `this.legendBinCount`. If they end up in different `.views` blocks, use `self.legendBinCount`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- graph-data-configuration-model`
Expected: PASS.

- [ ] **Step 6: Verify the legend still renders for the default case**

Run: `npm test -- choropleth-legend`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/components/data-display/models/data-configuration-model.ts v3/src/components/graph/models/graph-data-configuration-model.test.ts
git commit -m "CODAP-1293: drive legend bin count from per-attribute metadata"
```

---

## Task 4: Translation strings

**Files:**
- Modify: `src/utilities/translation/lang/en-US.json5`

Context: existing keys include `"V3.Inspector.graph.legendBins"`, `"V3.Inspector.graph.legendRange"`, and undo/redo keys like `"V3.Undo.legend.setLegendMin"`.

- [ ] **Step 1: Add the strings**

Next to `"V3.Inspector.graph.legendRange.max"` add:

```json5
    "V3.Inspector.graph.legendBinCount": "Number of Bins",
```

Next to the `legend.setLegendMin` undo/redo keys add (the spinner always holds a value, so there is no "clear" path — only set keys are needed):

```json5
    "V3.Undo.legend.setLegendBinCount": "Undo setting number of legend bins",
    "V3.Redo.legend.setLegendBinCount": "Redo setting number of legend bins",
```

- [ ] **Step 2: Verify the file still parses**

Run: `npm run build:tsc`
Expected: no errors (JSON5 is imported and type-checked indirectly; a syntax error would surface in tests).

- [ ] **Step 3: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/utilities/translation/lang/en-US.json5
git commit -m "CODAP-1293: add Number of Bins strings"
```

---

## Task 5: `LegendBinCountInput` spinner

**Files:**
- Modify: `src/components/data-display/inspector/legend-color-controls.tsx`
- Modify: `src/components/data-display/inspector/display-item-format-control.tsx`
- Modify: `src/components/data-display/inspector/display-item-format-control.scss`
- Test: `src/components/data-display/inspector/legend-color-controls.test.tsx`

Context: `LegendBinsSelect` and `LegendRangeInputs` already live in `legend-color-controls.tsx` and are rendered in `display-item-format-control.tsx` under `attrType === "numeric"`. Both read `dataConfiguration.legendQuantilesAreLocked` and disable themselves when locked (via react-aria `isDisabled` + a `.disabled` container). `display-item-format-control.scss` has a `.disabled { opacity: 0.5; pointer-events: none }` rule applied to `.legend-bins-row`/`.legend-range-section`. The react-aria `NumberField` spinner pattern is in `standard-error-adornment-registration.tsx` (`NumberField` with `minValue`/`step`, a `Group` containing `Input` + `Button slot="decrement"/"increment"`).

- [ ] **Step 1: Write failing tests**

The component reads `dataConfiguration.legendBinCount` (the model view from Task 3, which the plain-object mock must supply) for the displayed value, and `numericValuesForAttrRole` for the cap. The mock already has `numericValuesForAttrRole: () => [0, 10, 20, 40]` (4 distinct → cap 4). Add two things to the base mock: `legendBinCount: 4` at the top level (consistent with that cap), and the two metadata accessors:

```ts
    getAttributeNumberOfBins: jest.fn(() => undefined),
    setAttributeNumberOfBins: jest.fn(),
```
```ts
  // add alongside legendQuantilesAreLocked at the top level of the mock object:
  legendBinCount: 4,
```

Because the default clamps to the cap, the base mock (4 distinct values) yields 4, not 5. Tests that need a 5 supply ≥5 distinct values *and* the matching `legendBinCount`. Add a new `describe`:

```ts
describe("LegendBinCountInput", () => {
  beforeEach(() => jest.clearAllMocks())

  // 6 distinct values -> cap 6, so a default/effective count of 5 is representable
  const fiveBinConfig = (overrides?: Record<string, unknown>) => createMockDataConfig({
    numericValuesForAttrRole: jest.fn(() => [0, 10, 20, 30, 40, 50]),
    legendBinCount: 5,
    ...overrides
  })

  it("renders the Number of Bins spinner with the effective bin count", () => {
    const config = fiveBinConfig()
    render(<LegendBinCountInput dataConfiguration={config as any} />)
    expect(screen.getByText("V3.Inspector.graph.legendBinCount")).toBeInTheDocument()
    expect(screen.getByTestId("legend-bin-count-input")).toHaveValue("5")
  })

  it("reflects the stored bin count", () => {
    const config = fiveBinConfig({ legendBinCount: 3 })
    config.metadata.getAttributeNumberOfBins = jest.fn(() => 3)
    render(<LegendBinCountInput dataConfiguration={config as any} />)
    expect(screen.getByTestId("legend-bin-count-input")).toHaveValue("3")
  })

  it("commits a changed bin count via applyModelChange", async () => {
    const user = userEvent.setup()
    const config = fiveBinConfig()
    render(<LegendBinCountInput dataConfiguration={config as any} />)
    const input = screen.getByTestId("legend-bin-count-input")
    await user.clear(input)
    await user.type(input, "3{enter}")
    expect(config.metadata.applyModelChange).toHaveBeenCalled()
    expect(config.metadata.setAttributeNumberOfBins).toHaveBeenCalledWith("attr-1", 3)
  })

  it("is disabled when the legend quantiles are locked", () => {
    const config = fiveBinConfig({ legendQuantilesAreLocked: true })
    render(<LegendBinCountInput dataConfiguration={config as any} />)
    expect(screen.getByTestId("legend-bin-count-input")).toBeDisabled()
  })
})
```

Note for the implementer: react-aria's `NumberField` renders a text `<input>` (role `spinbutton`); `toHaveValue("5")` checks its formatted value. If `toHaveValue` proves flaky with the controlled `NumberField`, assert on `getAttribute("value")` or the `aria-valuenow` instead — adjust the assertion, not the component.

Also add `LegendBinCountInput` to the import at the top of the test file:
```ts
import { LegendColorControls, LegendBinsSelect, LegendBinCountInput, LegendRangeInputs } from "./legend-color-controls"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- legend-color-controls`
Expected: FAIL — `LegendBinCountInput` is not exported.

- [ ] **Step 3: Implement `LegendBinCountInput`**

In `legend-color-controls.tsx`, add `NumberField`, `Group` to the `react-aria-components` import, then add the component (place it after `LegendBinsSelect`):

```tsx
interface ILegendBinCountInputProps {
  dataConfiguration: IDataConfigurationModel
}

export const LegendBinCountInput = observer(function LegendBinCountInput(
  { dataConfiguration }: ILegendBinCountInputProps
) {
  const legendAttrID = dataConfiguration.attributeID("legend")
  const metadata = dataConfiguration.metadata
  const values = dataConfiguration.numericValuesForAttrRole("legend") ?? []
  const cap = Math.min(values.length, new Set(values).size)
  // While the quantiles are locked the legend scale is frozen, so this control has no effect.
  const isLocked = !!dataConfiguration.legendQuantilesAreLocked
  // The model clamps too (legendBinCount), but constrain the spinner so the arrows/typing match.
  const isDisabled = isLocked || cap < 2
  const value = dataConfiguration.legendBinCount

  const commit = (n: number) => {
    if (!Number.isFinite(n)) return
    const clamped = Math.max(2, Math.min(Math.round(n), cap))
    if (clamped === value) return // no change
    metadata?.applyModelChange(() => metadata.setAttributeNumberOfBins(legendAttrID, clamped), {
      undoStringKey: "V3.Undo.legend.setLegendBinCount",
      redoStringKey: "V3.Redo.legend.setLegendBinCount",
      log: "Set legend bin count"
    })
  }

  return (
    <NumberField
      className={clsx("legend-bin-count-field", { disabled: isDisabled })}
      aria-label={t("V3.Inspector.graph.legendBinCount")}
      minValue={2}
      maxValue={Math.max(2, cap)}
      step={1}
      formatOptions={{ maximumFractionDigits: 0 }}
      isDisabled={isDisabled}
      value={value}
      onChange={(n) => commit(n)}
    >
      <Label className="form-label legend-bin-count-label">{t("V3.Inspector.graph.legendBinCount")}</Label>
      <Group className="legend-bin-count-group">
        <Input className="form-input" data-testid="legend-bin-count-input" />
        <Button slot="decrement" className="legend-bin-count-stepper">−</Button>
        <Button slot="increment" className="legend-bin-count-stepper">+</Button>
      </Group>
    </NumberField>
  )
})
```

- [ ] **Step 4: Render it in the inspector**

In `display-item-format-control.tsx`, add `LegendBinCountInput` to the import from `./legend-color-controls`, and render it between the bins select and the range inputs:

```tsx
      <If condition={attrType === "numeric"}>
        <LegendBinsSelect dataConfiguration={dataConfiguration} />
        <LegendBinCountInput dataConfiguration={dataConfiguration} />
        <LegendRangeInputs dataConfiguration={dataConfiguration} />
      </If>
```

- [ ] **Step 5: Add SCSS**

In `display-item-format-control.scss`, add `.legend-bin-count-field` to the `.disabled` selector list and add layout styling. Inside `.palette-form`:

```scss
    .legend-bin-count-field {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      margin: 4px 0;

      .legend-bin-count-label {
        font-weight: normal;
      }

      .legend-bin-count-group {
        display: flex;
        flex-direction: row;
        align-items: center;

        .form-input {
          width: 3ch;
          text-align: center;
          border: 1px solid vars.$charcoal-light-1;
          border-radius: 3px;
        }

        .legend-bin-count-stepper {
          border: 1px solid vars.$charcoal-light-1;
          background: transparent;
          cursor: pointer;
          padding: 0 6px;
        }
      }
    }
```

And extend the existing disabled rule:

```scss
    .stroke-section,
    .color-picker-row,
    .legend-bins-row,
    .legend-bin-count-field,
    .legend-range-section {
      &.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- legend-color-controls display-item-format-control`
Expected: PASS.

- [ ] **Step 7: tsc + lint**

Run: `npm run build:tsc && npm run lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git add v3/src/components/data-display/inspector/legend-color-controls.tsx \
        v3/src/components/data-display/inspector/legend-color-controls.test.tsx \
        v3/src/components/data-display/inspector/display-item-format-control.tsx \
        v3/src/components/data-display/inspector/display-item-format-control.scss
git commit -m "CODAP-1293: add Number of Bins spinner to the numeric legend inspector"
```

---

## Task 6: Manual verification + full suite

- [ ] **Step 1: Full type-check, lint, and relevant tests**

Run:
```bash
npm run build:tsc
npm run lint
npm test -- data-set-metadata color-utils graph-data-configuration-model legend-color-controls display-item-format-control choropleth-legend
```
Expected: all clean / green.

- [ ] **Step 2: Manual QA (dev server)**

Run `npm start`, load data with a numeric attribute, drag it to a graph's legend (and a map's legend):
- The Format/Layers menu shows "Number of Bins" defaulting to 5, between "Legend Bins" and "Legend Range".
- Changing the count re-splits the legend colors immediately (both Linear and Quantile types).
- The spinner won't exceed `min(#points, #distinct)` or go below 2.
- Locking the legend quantiles disables the spinner.
- Save the document, reload: the bin count persists. Remove the legend and re-add the same attribute: the bin count persists.

- [ ] **Step 3: Push the branch**

```bash
cd /Users/kswenson/Development/cc-dev/codap
git push -u origin CODAP-1293-legend-bin-count
```

---

## Out of scope (Plan 2)

- Two-way V2 mapping: import V2 `numberOfLegendQuantiles` → legend attribute `numberOfBins`; export effective `numberOfBins` → `numberOfLegendQuantiles`. Touches `src/v2/codap-v2-type-utils.ts` (shared `import/exportLegendQuantileProps`, `import/exportV3Properties`), `v2-graph-importer.ts`/`v2-graph-exporter.ts`, and `v2-map-importer.ts`/`v2-map-exporter.ts` (the map uses the shared `import/exportV3Properties`), plus the dual native-V2 + `v3:`-namespace export paths.
- Removal of the dead `numberOfLegendQuantiles` model field + `setNumberOfLegendQuantiles` + its two call sites in `setLegendQuantilesAreLocked` (coupled to the V2 import change, which currently writes that field into the config snapshot).
