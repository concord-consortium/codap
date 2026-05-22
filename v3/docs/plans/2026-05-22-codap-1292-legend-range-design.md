# CODAP-1292 — Change the Range of a Numeric Legend · Design

**Status:** Draft
**Date:** 2026-05-22
**Author:** Kirk Swenson (with Claude)
**Jira:** [CODAP-1292](https://concord-consortium.atlassian.net/browse/CODAP-1292) · Epic [CODAP-1312](https://concord-consortium.atlassian.net/browse/CODAP-1312) (Large Data Support)

## Goal

Let users override the min and max of the numeric range used by a graph or map legend, instead of always defaulting to the legend attribute's full data extent. The override:

- Lives per-attribute in dataset metadata, so it applies wherever that attribute is used as a legend.
- Survives removing and re-adding the legend.
- Serializes with the document.
- Applies in both `quantize` (continuous gradient) and `quantile` (count-balanced bins) legend-bin modes.

## Motivation

For large or asymmetric datasets, the default behavior — pinning the legend gradient to the attribute's actual min/max — makes most cases look nearly identical and washes out the visual distinction the legend is meant to provide. Letting users tighten or shift the range gives them control over how the color encoding subdivides their data.

## Non-goals

- V2 backward-compatibility for the override. The override is a V3-only feature; V3 → V2 export drops it.
- Categorical-legend range editing.
- Saving named "presets" of legend ranges.
- A document-version bump (the new fields are additive).
- Changes to the missing-data color or to category-legend rendering.

## User-visible behavior

### Inspector — graph Format menu and map Layers menu

A new **Legend Range** section appears immediately below the existing **Legend bins** dropdown, shown whenever a numeric legend attribute is set. It contains two number inputs:

```
[ Legend bins  v ]
─────────────────
Legend Range
  Min  [   0   ]
  Max  [  40   ]
```

- **Pre-fill.** When no override is set for a given bound, the field is pre-filled with the current data extent for that bound (formatted with the inspector's existing numeric formatter). When an override is set, the field shows the stored override value.
- **Independent bounds.** Min and Max can be overridden independently; setting only one is allowed.
- **Commit.** Edits commit on Enter or blur (matching the Bin Width control).
- **Clear.** Deleting the field text and committing reverts that bound to live data extent.
- **Escape.** Cancels the in-progress edit and restores the previously displayed value.
- **Invalid range.** If a commit of a *typed* value would produce `min >= max`, the offending field silently reverts to its previous committed value. No error message, no toast.
- **Clearing always succeeds.** If clearing a bound (committing the empty string) would result in a degenerate range because the live data extent crosses the other bound, the clear is still applied. The user is responsible for resolving the resulting degenerate legend by clearing or adjusting the other bound.
- **Keystroke filter.** Same numeric filter as Bin Width (digits, one decimal point, optional leading minus).
- **Character cap.** Same as Bin Width (`kInputMaxCharacters = 12`).
- **Dynamic input width.** Field width grows with content, matching Bin Width.

Both the graph Format menu and the map Layers menu are powered by the shared `DisplayItemFormatControl`, so the new section is implemented once and appears in both places.

### Legend rendering

- **Quantize mode.** The color scale's domain becomes `[effectiveMin, effectiveMax]`, where each effective bound is the override (if set) or the data extent (otherwise). Cases whose values fall outside the range render with the low- or high-end bin's color — d3's `scaleQuantize` maps out-of-domain values to the corresponding extreme of the range automatically. The legend's axis tick labels reflect the effective bounds.
- **Quantile mode.** The values used to compute quantile breaks are filtered to `[effectiveMin, effectiveMax]` first. Out-of-range cases render in the first or last bin's color — d3's `scaleQuantile` maps values below/above the trained domain to the first/last bin automatically.

### Persistence

Overrides serialize with the dataset metadata and round-trip naturally through V3 save/restore. A V3 → V2 → V3 round trip loses the override (V2 has no equivalent field).

### Undo / redo

Each commit (Enter or blur) is one undo step, with action labels `"Set legend min"`, `"Set legend max"`, `"Clear legend min"`, `"Clear legend max"`.

## Architecture

### Data model

**File:** `v3/src/models/shared/data-set-metadata.ts`

Extend `AttributeScale` (already holds `binningType`):

```ts
const AttributeScale = types.model("AttributeScale", {
  binningType: types.maybe(types.enumeration(["quantize", "quantile"])),
  legendMin: types.maybe(types.number),
  legendMax: types.maybe(types.number),
})
```

Add to `DataSetMetadata`, modeled on the existing `get/setAttributeBinningType` pair:

| Method | Returns | Notes |
|---|---|---|
| `getAttributeLegendMin(attrId)` | `number \| undefined` | Returns `undefined` when no override is set. |
| `setAttributeLegendMin(attrId, value)` | — | Calls `requireAttributeMetadata`; `value === undefined` clears the override. |
| `getAttributeLegendMax(attrId)` | `number \| undefined` | |
| `setAttributeLegendMax(attrId, value)` | — | |
| `getAttributeLegendRange(attrId)` | `{ min?: number, max?: number }` | Convenience accessor used by the color-scale getter. |

Setters are MST actions; callers wrap them in `applyModelChange` for undo/redo.

### Color scale

**File:** `v3/src/components/data-display/models/data-configuration-model.ts`

Modify the `legendNumericColorScale` getter to apply the override. The existing scale construction uses d3's `scaleQuantize` for the quantize branch and `scaleQuantile` for the quantile branch; we keep both and only change their inputs.

```ts
const legendAttrId = self.attributeID("legend")
const values = self.numericValuesForAttrRole("legend") ?? []
const dataExtent = extent(values)
const { min: overrideMin, max: overrideMax } =
  self.metadata?.getAttributeLegendRange(legendAttrId) ?? {}
const effectiveMin = overrideMin ?? dataExtent[0]
const effectiveMax = overrideMax ?? dataExtent[1]
```

**Quantize branch:**

```ts
if (effectiveMin == null || effectiveMax == null) {
  return scaleQuantize([], self.choroplethColors)   // preserve existing empty fallback
}
return scaleQuantize([effectiveMin, effectiveMax], self.choroplethColors)
```

`scaleQuantize` maps out-of-domain values to the corresponding extreme of the range automatically, so no explicit clamp call is needed.

**Quantile branch:**

```ts
const filtered =
  (overrideMin == null && overrideMax == null)
    ? values
    : values.filter(v =>
        (overrideMin == null || v >= overrideMin) &&
        (overrideMax == null || v <= overrideMax)
      )
return scaleQuantile(filtered, self.choroplethColors)
```

**Cache invalidation.** The existing reactor that clears `_legendNumericColorScale` when `legendQuantilesAreLocked` flips relies on MST observation. Because `legendMin` / `legendMax` live in the same MST tree (`DataSetMetadata`), reads from inside the getter create dependencies that fire automatically. If during implementation we find a stale-cache edge case, mirror the existing locked-quantile reactor for the new fields.

### Inspector UI

**Files:**
- `v3/src/components/data-display/inspector/legend-color-controls.tsx` — add a new `LegendRangeInputs` component immediately after `LegendBinsSelect`.
- `v3/src/components/data-display/inspector/display-item-format-control.tsx` — already renders `LegendColorControls`, so no structural change.

`LegendRangeInputs` responsibilities:
- Local `useState<string>` for each field's in-progress text, so typing doesn't fight MST.
- Read effective values from `metadata.getAttributeLegendRange(attrId)` and `extent(this.numericValuesForAttrRole("legend"))`.
- Render two labeled inputs (`Min`, `Max`) with dynamic width and the existing numeric filter.
- On Enter / blur: parse, validate against the other bound, then call the appropriate setter via `applyModelChange`. On invalid input, reset local state to the previous committed display value.
- On Escape: reset local state.
- The displayed default (when no override is set) is MobX-observed, so the field updates as the underlying data extent changes — only while no override is in effect.

### Localization

New strings to add to `v3/src/utilities/translation/lang/en-US.json5`:

- `DG.Inspector.legendRange` — `"Legend Range"`
- `DG.Inspector.legendRange.min` — `"Min"`
- `DG.Inspector.legendRange.max` — `"Max"`

Other locale files will be updated via the standard translation workflow; until then the keys fall back to the English source.

## Persistence and V2 compatibility

- **V3 round-trip:** automatic via MST snapshot. No migration. No version bump.
- **V2 → V3 import:** no V2 property exists; legendMin / legendMax stay `undefined`. Behavior matches V2.
- **V3 → V2 export:** override is dropped. Lossy V2 round-trip is documented and accepted.
- **Future V2 spec extension:** out of scope for this story; can be filed as a follow-up if cross-version interoperability becomes a requirement.

## Testing strategy

1. **Model tests** — `v3/src/models/shared/data-set-metadata.test.ts` (or a sibling file)
   - `set/getAttributeLegendMin` round-trips.
   - `setAttributeLegendMin(attrId, undefined)` clears the override.
   - Two attributes hold independent ranges.
   - Metadata entry is lazily created.

2. **Color-scale tests** — `v3/src/components/data-display/models/data-configuration-model.test.ts`
   - Quantize, no override: domain equals data extent.
   - Quantize, override min only: domain `[overrideMin, dataMax]`.
   - Quantize: an out-of-range value receives the end color (clamp works).
   - Quantile: bin breaks come from filtered values.
   - Quantile: an out-of-range case lands in the first/last bin color.

3. **UI tests** — `v3/src/components/data-display/inspector/legend-color-controls.test.tsx`
   - Inputs render only when a numeric legend is set.
   - Pre-fill from data extent when no override; from override values when set.
   - Enter and blur each commit a valid value via `applyModelChange`.
   - `min >= max` silently reverts the offending field.
   - Empty value commits `undefined`.
   - Escape cancels.

4. **Serialization tests** — `v3/src/v2/v2-document-round-trip.test.ts`
   - V3 → V3 preserves override.
   - V3 → V2 → V3 loses override (documented behavior).

5. **Cypress smoke test (optional).** Only if existing legend-inspector coverage already exists; otherwise defer to manual QA:
   - Graph: open Format menu, set Min/Max, verify legend updates and points render with clamped colors.
   - Map: same via Layers menu.

## Edge cases (documented, no code action)

- `dataMin === dataMax`. The override actually resolves the otherwise-degenerate gradient — a user can type `[v − ε, v + ε]` to see a visible color range.
- Legend attribute deleted from the dataset. Orphaned `AttributeMetadata` is a pre-existing concern shared with `binningType` and `colorRange`; not addressed here.
- Filtered or hidden cases. `numericValuesForAttrRole("legend")` already governs which values count toward the data extent; we use the same source, so behavior is consistent with the existing legend.

## Risks and open questions

- **Cache reactivity** (mentioned in Architecture → Color scale). Plan: trust MST observation; revisit only if a stale-scale bug surfaces during implementation.
- **Floating-point display.** Pre-filling Min/Max with raw `dataMin`/`dataMax` could expose long decimals. We reuse the inspector's existing formatter to avoid surprises, but UX should be sanity-checked during implementation.

## Out-of-scope follow-ups

- V2 spec extension to carry `legendMin` / `legendMax`.
- Plugin API surface for reading or setting the legend range programmatically.
- Tooltips on out-of-range points indicating "value clamped from X to Y."
