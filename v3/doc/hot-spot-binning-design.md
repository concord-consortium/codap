# Hot Spot Color Binning: Design

Story: CODAP-1646. Implementation plan: [hot-spot-binning-plan.md](hot-spot-binning-plan.md).

## Summary

The map's hot spot layer draws density as a smooth gradient along the chosen color ramp. This feature lets the
user draw it in a small number of flat color classes instead, with a new slider in the hot spot section of the
map's layers palette. The slider sets 2 through 10 classes, or continuous, which is the default and draws the
layer as it is drawn today.

The hot spot layer is behind the `mapHotSpot` feature flag, and so is everything here.

## User interface

One control is added to the hot spot controls, below High color:

```
[x] Hot spot
Resolution     ──────●────
Opacity        ──────●────
Color          [▮▮▮▮ Heat          ▾]
Low color                         [■]
High color                        [■]
Color binning  ──────────●
                           continuous
```

### Color binning

A slider labeled **Color binning** with ten positions:

| Position | Meaning | Readout |
| --- | --- | --- |
| 2 through 10 | That many classes | "2 classes" … "10 classes" |
| 11 (far right, default) | Continuous | "continuous" |

- **Readout.** A line of text below the slider, justified to the right, shows the readout for the slider's
  current position. It updates as the slider moves.
- **Screen readers.** The thumb's `aria-valuetext` is the same readout text, so a screen reader announces
  "5 classes" or "continuous" as the slider is adjusted. The visible readout line is `aria-hidden`, so the text
  is not announced twice.
- **Live update, deferred commit.** Like the Resolution and Opacity sliders, the map redraws as the slider
  moves, but the change is committed to the document (one undo step, one log event) only when the change ends
  or the thumb loses focus. If the value at that point equals the committed value, nothing is committed.
- **Disabled** when the Hot spot checkbox is off, like the other controls in the section.
- **Out-of-range values.** A document can hold a bin count the slider can't show (for example 15, from a
  hand-edited document or a plugin). The thumb then sits at the nearest numeric end of the slider (position 2
  or 10, never the continuous position), the readout shows the real value ("15 classes"), and the model keeps
  the value until the user moves the slider.
- **Test id:** `map-hot-spot-color-binning-slider`, extending the existing `map-hot-spot-` prefix.

The ramp preview strips in the Color menu do not change. They stay continuous whatever the binning.

### Strings

| Key | English |
| --- | --- |
| `V3.Inspector.map.hotSpotColorBinning` | Color binning |
| `V3.Inspector.map.hotSpotColorBinning.classes` | %@ classes |
| `V3.Inspector.map.hotSpotColorBinning.continuous` | continuous |
| `V3.Undo.map.changeHotSpotColorBinning` | Undo changing hot spot color binning |
| `V3.Redo.map.changeHotSpotColorBinning` | Redo changing hot spot color binning |

The slider never shows "1 classes", but an out-of-range saved value of 1 would. That case is not worth a
separate singular string.

### Logging

Committing a change logs `mapAction: %@` with `{ mapAction: "changeHotSpotColorBinning", colorBins, dataset }`,
where `colorBins` is the new number or `"continuous"`.

## Model

`MapHotSpotModel` gets one new property:

```ts
colorBins: types.optional(types.union(types.literal("continuous"), types.number), "continuous")
```

- **Type.** `HotSpotColorBins = number | "continuous"`, exported from `hot-spot-utils.ts` with the constant
  `kContinuousColorBins = "continuous"`.
- **Why a string literal for continuous.** The saved document says what it means, and the same type serves the
  in-progress slider value, where `undefined` already means "no change in progress". The alternative, an
  absent `colorBins` meaning continuous, would need a second sentinel for the in-progress value, and would
  put "absent is smooth" next to "0 is fully transparent".
- **In-progress value.** A volatile `dynamicColorBins: Maybe<HotSpotColorBins>` holds the slider's value while
  it is being adjusted. The view `displayColorBins` returns `dynamicColorBins ?? colorBins`, and is what the
  layer renders. This matches `dynamicOpacity` / `displayOpacity`.
- **Actions.** `setColorBins(colorBins)` sets the property and clears `dynamicColorBins`.
  `setDynamicColorBins(colorBins)` sets the volatile value.
- **Invalid saved values.** `preProcessSnapshot` drops a `colorBins` that is neither `"continuous"` nor a
  finite number, so the hot spot loads with the default rather than failing to load. This is the treatment
  `colorRamp` gets now. Finite numbers outside 2 through 10 are valid and are kept.

### Import and export

No new import or export logic is needed. The hot spot model's snapshot is written whole to the v2 document's
`v3.hotSpot` extension when any property differs from its default, and read back as a snapshot, so `colorBins`
travels with the other properties. The only change is to the storage type:

```ts
export interface ICodapV2MapHotSpotStorage {
  // ...
  colorBins?: number | string
}
```

It is typed as `number | string` rather than `HotSpotColorBins` for the same reason `colorRamp` is typed as
`string`: the stored value is unvalidated until the model's `preProcessSnapshot` has seen it.

## Rendering

Binning is applied when the color lookup table is built. Nothing downstream of the table changes: the density
grid, the normalization by maximum density and `colorizeDensityGrid` are untouched.

```ts
buildColorLUT(interpolator: ColorInterpolator, colorBins: HotSpotColorBins = kContinuousColorBins)
```

The table has 256 entries. Entry `i` stands for the normalized density `d = i / 255`.

- **Continuous.** As today: entry `i` is the ramp color at `d`, with its alpha multiplied by `hotSpotFade(d)`.
- **n ≥ 2 bins.** The density range [0, 1] is split into n bins of equal width. Entry `i` falls in bin
  `k = min(n − 1, floor(d · n))`, and every entry in bin `k` gets the same color: the ramp color at
  `t = k / (n − 1)`, with its alpha multiplied by `hotSpotFade(t)`. So the lowest bin is the low color, the
  highest bin is the high color, and the bins between are evenly spaced along the ramp.
- **n ≤ 1.** Every entry is the ramp's low color with alpha 0.
- **Non-integers** are rounded to the nearest integer before any of the above. A value that is not finite is
  treated as n ≤ 1. The UI produces neither.

| Bins | Ramp positions used |
| --- | --- |
| 2 | 0, 1 |
| 3 | 0, 1/2, 1 |
| 4 | 0, 1/3, 2/3, 1 |
| 5 | 0, 1/4, 1/2, 3/4, 1 |

### Consequences of the fade

Each bin's color includes the fade opacity at its ramp position, and `hotSpotFade` is 0 at or below 0.02 and 1
at or above 0.35. Two things follow:

- **The lowest bin is always invisible.** Its ramp position is 0, where the fade is 0. "n classes" therefore
  draws n − 1 visible bands. With 2 classes, the upper half of the density range is the solid high color and
  the rest of the map is clear.
- **Low bins are faint at high bin counts.** A bin is fully opaque only if its ramp position is at least 0.35.
  With 10 classes, the second bin is at 1/9 ≈ 0.11, where the fade is about 0.19, and the third is at 0.22,
  where it is about 0.67.

Both are intended: the binned layer keeps the continuous layer's fade into the base map rather than ending in
a hard edge of the low color.

### Redraw

`MapHotSpotLayer`'s redraw reaction adds `hotSpotModel.displayColorBins` to the values it watches, and the
draw function passes it to `buildColorLUT`. Changing the binning rebuilds only the lookup table. The density
surface does not depend on it and is not recomputed, so the live update during a drag is cheap and needs no
equivalent of `shouldOptimize`.

## Components

- **`MapHotSpotBinningSlider`** (new, `map-hot-spot-binning-slider.tsx`), modeled on
  `MapHotSpotResolutionSlider`. It takes the `mapPointLayerModel`, converts between slider positions and
  `HotSpotColorBins`, and owns the commit, undo and log logic. It uses `ValueTextSliderThumb` for the
  `aria-valuetext`.
- **`MapHotSpotControl`** renders it after the High color row.
- **`map-inspector.scss`** gets a rule for the readout line: right-justified, in the palette's secondary text
  style, and dimmed when the slider is disabled.

The conversion between slider positions and model values lives in `hot-spot-utils.ts` so it can be tested
without rendering:

| Function | Behavior |
| --- | --- |
| `colorBinsToSliderValue(colorBins)` | `"continuous"` → 11; a number → rounded and clamped to 2 through 10 |
| `sliderValueToColorBins(value)` | 11 → `"continuous"`; otherwise the value |

## Testing

Jest unit tests, alongside the code they cover:

- **`hot-spot-utils.test.ts`**
  - `buildColorLUT` with continuous binning matches the current output.
  - With 2, 3 and 4 bins: the entries in each bin are identical, the bin boundaries fall at the expected
    entries, the colors are the ramp colors at the expected positions, and the lowest bin's alpha is 0.
  - With 1, 0, a negative number and `NaN`: every entry has alpha 0.
  - A non-integer count gives the same table as its rounded value.
  - The slider conversion functions, including out-of-range and non-integer values.
- **`map-hot-spot-model.test.ts`**
  - The default is `"continuous"`.
  - `setDynamicColorBins` changes `displayColorBins` but not `colorBins`; `setColorBins` changes both and
    clears the dynamic value.
  - A snapshot with an invalid `colorBins` loads with the default; one with an out-of-range number keeps it.
- **`map-hot-spot-binning-slider.test.tsx`** (new)
  - The readout and `aria-valuetext` for a numeric value and for continuous.
  - Moving the slider sets the dynamic value without committing; ending the change commits it with one undo
    entry; blur commits an in-progress change; ending on the committed value commits nothing.
  - Disabled when the hot spot is hidden.
  - An out-of-range value shows the real count in the readout.
- **`map-hot-spot-control.test.tsx`**: the slider is rendered, after the High color row.
- **`map-hot-spot-layer.test.tsx`**: changing `colorBins` or `dynamicColorBins` redraws the layer, and the
  draw function builds the table with `displayColorBins`.
- **`v2-map-importer.test.ts`** and the exporter's tests: `colorBins` round-trips, as a number and as
  `"continuous"`.

## Out of scope

- Showing the binning in the ramp preview strips.
- A legend for the classes.
- Bin boundaries that are not evenly spaced (quantiles, natural breaks).
- Dropping the fade for binned layers, or making the lowest bin visible.
