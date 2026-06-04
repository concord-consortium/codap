# CODAP-1293: Change the number of bins for a numeric legend — Design

- **Jira:** CODAP-1293 (Epic CODAP-1312 "Large Data Support"), 3 pts, Sprint 18
- **Grant:** GRANT-35 (405 Mapping Time)
- **Branch:** `CODAP-1293-legend-bin-count`, off `CODAP-1292-legend-range` (builds directly on the 1292 metadata + UI infrastructure)
- **Date:** 2026-06-04

## Summary

For large and asymmetric data sets, students need finer control over how a numeric
legend is subdivided. This story adds a user-editable **Number of Bins** control to the
numeric-legend section of the graph Format menu and the map Layers menu (shared code,
one implementation covers both). The default is 5. The control is an integer spinner
with up/down arrows, capped at `min(#points, #distinct values)` and floored at 2.

The value persists per attribute (surviving legend removal) and serializes with the
document, mirroring the per-attribute persistence introduced for the legend range in
CODAP-1292.

## Background: how legend bins work today

- `getChoroplethColors(color1, color2)` (`src/utilities/color-utils.ts:167`) is **hardcoded
  to return exactly 5 colors** (`[color1, .25, .5, .75, color2]`).
- `legendNumericColorScale` (`data-configuration-model.ts`) builds `scaleQuantize` /
  `scaleQuantile` whose **bin count equals the number of colors** — so "5 bins" is literally
  "5 colors" today.
- `numberOfLegendQuantiles` exists on `DataConfigurationModel` but is **write-only dead state
  in V3**: it is set by the lock action and V2 import and **never read** to compute anything.
  V3 always renders 5 bins regardless of its value.

### V2 truth (from `master`, `apps/dg/.../plot_data_configuration.js`)

In V2, `numberOfLegendQuantiles` **is** the legend bin count: default 5, read to compute
`nQuantileValues(values, N)`, and saved/restored. However it appears in **only that one V2
file** — there is **no inspector UI and no Data Interactive (plugin) API** that sets it. So
every native V2 document carries `numberOfLegendQuantiles = 5` (or omits it); the only way a
non-5 value could exist is a future V3 export. The field is therefore meaningful to V2's
renderer but was never surfaced to V2 users. V3 currently imports it and discards it (the
pre-existing gap this story closes).

## Decisions (resolved during brainstorming)

1. **Bin count lives per-attribute** in `AttributeScale` metadata (new `numberOfBins`),
   consistent with CODAP-1292's `legendMin`/`legendMax`. (Not the existing
   per-configuration `numberOfLegendQuantiles`.)
2. **Remove `numberOfLegendQuantiles`** from the V3 model as part of this story; its role is
   subsumed by `numberOfBins`.
3. **Full two-way V2 mapping (B-full):** import V2 `numberOfLegendQuantiles` → legend
   attribute's `numberOfBins`; export `numberOfBins` → V2 `numberOfLegendQuantiles`.
   Rationale: it is meaningful to V2's renderer, there may historically have been a way to
   set it, and it gives V3→V2→V3 round-trip fidelity.
4. **Cap behavior:** entering a value above the cap **clamps to the cap**; **floor of 2**
   (a single-bin legend is degenerate).
5. **Default clamps to cap:** effective bins = `clamp(numberOfBins ?? 5, 2, cap)`, so a
   low-distinct attribute defaults to fewer than 5 bins. This is a minor, intentional
   behavior change from today's "always 5 colors."
6. **UI primitive:** react-aria `NumberField` spinner (native integer clamping), not the
   1292 `TextField` approach.
7. **Menu wording:** the bins-type dropdown already reads "Quantile" (not "Quintile"), which
   does not imply a fixed count, so no new term is needed. The new field is labeled
   "Number of Bins."

## Components

### 1. Data model — `src/models/shared/data-set-metadata.ts`

- Add `numberOfBins: types.maybe(types.number)` to `AttributeScale`.
- Add `getAttributeNumberOfBins(attrId)` and `setAttributeNumberOfBins(attrId, value?)`,
  mirroring `getAttributeLegendMin/Max` and `setAttributeLegendMin/Max`. Clearing
  (`undefined`) is a no-op if no scale exists; after clearing, reuse the existing
  empty-scale cleanup (`isAttributeScaleEmpty`) so a scale left with no fields is removed.

### 2. Remove `numberOfLegendQuantiles` — `data-configuration-model.ts`

- Delete the `numberOfLegendQuantiles` model property.
- Delete the `setNumberOfLegendQuantiles` action.
- Remove its two call sites inside `setLegendQuantilesAreLocked` (lock continues to use
  `legendQuantilesAreLocked` + `legendQuantiles` + the cached `_legendNumericColorScale`).

### 3. Effective bin count + color ramp

- `src/utilities/color-utils.ts`: generalize
  `getChoroplethColors(color1, color2, count = 5)` to interpolate `count` evenly-spaced
  colors between the endpoints (`count = 2` → `[color1, color2]`; preserves the current
  5-color output when `count` is omitted/5).
- `data-configuration-model.ts`:
  - Add a view for the legend attribute's effective bin count:
    `cap = min(values.length, new Set(values).size)`; `effectiveBins = clamp(numberOfBins ?? 5, 2, cap)`.
    If `cap < 2`, the legend is degenerate (single value); fall back to 1 color/bin.
  - `choroplethColors` getter passes `effectiveBins` to `getChoroplethColors`.
  - `legendNumericColorScale` is otherwise unchanged: `scaleQuantize`/`scaleQuantile` derive
    N bins from the N-color range and already respect the 1292 effective range.

### 4. UI control — `src/components/data-display/inspector/legend-color-controls.tsx`

- New exported `LegendBinCountInput` (observer), rendered in
  `display-item-format-control.tsx` **between** `LegendBinsSelect` and `LegendRangeInputs`,
  inside the existing `attrType === "numeric"` block.
- react-aria `NumberField` with `minValue={2}`, `maxValue={cap}`, `step={1}`, integer
  formatting (`formatOptions={{ maximumFractionDigits: 0 }}`), and a `Group` containing
  `Input` + decrement/increment `Button`s — modeled on
  `standard-error-adornment-registration.tsx`.
- Value shows the effective bin count. On commit (`onChange`/blur/Enter), write via
  `metadata.applyModelChange(() => setAttributeNumberOfBins(...))`. Empty → clear override
  (reverts to 5). `NumberField` clamps to `[2, cap]` natively.
- **Disabled when `legendQuantilesAreLocked`** (same `isDisabled` + `.disabled` container
  pattern as `LegendBinsSelect`/`LegendRangeInputs`). Also disabled when `cap < 2`.
- Translations in `en-US.json5`: `V3.Inspector.graph.legendBinCount` plus undo/redo keys
  (`V3.(Un|Re)do.legend.(set|clear)LegendBinCount`). SCSS for the spinner in
  `display-item-format-control.scss`.

### 5. V2 import/export — `src/v2/codap-v2-type-utils.ts`, importer, exporter

The currently-shared import/export helper must **diverge** (it no longer maps to a single
config field):

- **Import** (`v2-graph-importer.ts`): stop spreading `numberOfLegendQuantiles` into the
  DataConfiguration snapshot. Instead, after the legend attribute is known, set the legend
  attribute's `numberOfBins` on `sharedMetadata` from
  `componentStorage.numberOfLegendQuantiles` — only when it differs from the default of 5, so
  the common case creates no metadata (matching the 1292 "no metadata for defaults" rule).
  Continue importing `legendQuantilesAreLocked` + `legendQuantiles`. Re-key the import
  validation gate (currently early-returns when `numberOfLegendQuantiles == null`) onto
  `legendQuantilesAreLocked`/`legendQuantiles` so locked docs still import.
- **Export** (`v2-graph-exporter.ts`): write `numberOfLegendQuantiles` = the legend
  attribute's effective `numberOfBins` (`?? 5`). Keep `legendQuantilesAreLocked` and (when
  locked) `legendQuantiles` exactly as today.

### 6. Lock interaction

No behavioral change. Locking freezes the current scale (which now reflects N bins). The
Number-of-Bins control is disabled while locked, consistent with the bins dropdown and the
range inputs.

#### Why the lock stays on `DataConfigurationModel` (not in per-attribute metadata)

It is reasonable to ask why `numberOfBins`/`legendMin`/`legendMax`/`binningType` live in
per-attribute `AttributeScale` metadata while `legendQuantilesAreLocked` + `legendQuantiles`
remain on the per-display `DataConfigurationModel`. The boundary is deliberate:

- The metadata fields are **display-independent inputs** to the scale — configuration knobs.
  Sharing them per attribute across every tile that uses the attribute as a legend is a
  feature (set the range/type/count once, it applies everywhere).
- The lock is a **display-specific cached output**: `legendQuantiles` are the *frozen
  threshold values* captured from `getScaleThresholds(self.legendNumericColorScale)`. That
  scale is built from `numericValuesForAttrRole("legend")`, which is filtered **per display**
  (hidden cases, `displayOnlySelectedCases`, …). The same attribute used as a legend in a
  graph and a map can legitimately have different frozen thresholds, so a single per-attribute
  copy could not represent both. The locked flag and the thresholds are coupled and move
  together.

This also keeps the lock's V2 round-trip 1:1 (V2 stores `legendQuantilesAreLocked` +
`legendQuantiles` on the per-display `plot_data_configuration`). We diverge from V2's
per-display model only for the *count*, because the count is a shared input worth sharing.

## Data flow

```
User sets N in NumberField
  → applyModelChange → metadata.setAttributeNumberOfBins(legendAttrId, N)   [per-attribute, serialized]
  → choroplethColors getter reads effectiveBins = clamp(N ?? 5, 2, cap)
  → getChoroplethColors(low, high, effectiveBins) → N colors
  → legendNumericColorScale builds scaleQuantize/scaleQuantile with N colors → N bins
  → numeric-legend rendering reflects N bins

V2 import:  componentStorage.numberOfLegendQuantiles → sharedMetadata numberOfBins (legend attr)
V2 export:  legend attr numberOfBins → componentStorage.numberOfLegendQuantiles
```

## Error / edge handling

- `cap < 2` (≤1 distinct value): degenerate legend; control disabled, single bin/color.
- Override above cap: clamped to cap (NumberField + the model clamp both enforce).
- Override below 2: floored at 2.
- Empty input: clears the override → effective reverts to 5 (then clamped to cap).
- No legend attribute on V2 import/export: nothing to map (skip).
- Existing V3 documents carrying the removed `numberOfLegendQuantiles` field: ignored on
  load (MST drops unknown snapshot properties).

## Testing

- **Model:** `numberOfBins` get/set/clear + empty-scale cleanup; effective-bins clamping
  (default clamps to cap; floor 2; ≤ cap); `getChoroplethColors(n)` returns n colors;
  `legendNumericColorScale` yields N bins in both quantize and quantile modes.
- **Removal:** lock/unlock no longer references `numberOfLegendQuantiles`; existing lock
  tests stay green.
- **UI:** spinner renders, clamps to cap, floors at 2, disabled when locked / when cap < 2,
  commit/clear paths.
- **V2:** import maps `numberOfLegendQuantiles` → legend attr `numberOfBins`; export derives
  it back; V3→V2→V3 round-trip fidelity.

## Out of scope

- Reworking the lock feature (only the dead count field is removed).
- The deferred CODAP-1292 a11y items (M4 disabled-contrast, M5.4 focus-on-lock, L2
  aria-live).
- V3↔V2 round-trip of the bins *type* (Linear/Quantile) — remains V3-only as today.
