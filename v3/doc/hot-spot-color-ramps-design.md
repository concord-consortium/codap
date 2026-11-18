# Hot Spot Color Ramps: Design

Story: CODAP-1645. Implementation plan: [hot-spot-color-ramps-plan.md](hot-spot-color-ramps-plan.md).

## Summary

The map's hot spot layer currently draws density with one fixed gradient, black to white. This feature lets the
user choose the color ramp in the hot spot section of the map's layers palette: one of four built-in ramps, or a
custom ramp between two colors they pick.

The hot spot layer is behind the `mapHotSpot` feature flag, and so is everything here.

## User interface

Three rows are added to the hot spot controls, below Opacity:

```
[x] Hot spot
Opacity     ──────●────
Color       [▮▮▮▮ Heat          ▾]
Low color                      [■]
High color                     [■]
```

### Color

A menu labeled **Color** with these options, in this order:

| Option | Value saved | Ramp, from low density to high |
| --- | --- | --- |
| Heat (default) | `heat` | d3's Inferno: near-black, purple, orange, pale yellow |
| Viridis | `viridis` | d3's Viridis: dark purple, teal, yellow |
| Cividis | `cividis` | d3's Cividis: dark blue, gray, yellow |
| Monochrome | `monochrome` | Black to white (the gradient used before this feature) |
| Custom | `custom` | Low color to high color, interpolated in CIELAB |

- A preview strip of the ramp appears to the left of each option's name, in the open menu and in the closed
  menu's button for the selected option.
- The Custom option's strip shows the current low and high colors, so it updates as they change.
- The strips show the ramp's colors only. They do not show the fade to transparent that the layer applies at low
  densities.
- The strips are decorative (`aria-hidden`). Each option's accessible name is its text.

### Low color and High color

- Each row has a label and a color swatch that opens the color picker. They use `PointColorSetting`, the same
  component as Fill Color.
- Both rows are disabled unless Color is Custom. A disabled row keeps showing its saved color.
- Choosing a built-in ramp does not change the saved low and high colors, so switching back to Custom restores
  them.

### Disabled states

| Control | Disabled when |
| --- | --- |
| Color menu | The hot spot is hidden (same as Opacity) |
| Low color, High color | The hot spot is hidden, or Color is not Custom |

### Undo and logging

Each change is one undoable action, applied with `applyModelChange`, and is logged as a `mapAction`, following
the existing opacity control.

| Change | Undo/redo string keys | Logged `mapAction` |
| --- | --- | --- |
| Color ramp | `V3.Undo.map.changeHotSpotColorRamp`, `V3.Redo.…` | `changeHotSpotColorRamp`, with `colorRamp` |
| Low color | `V3.Undo.map.changeHotSpotLowColor`, `V3.Redo.…` | `changeHotSpotLowColor`, with `color` |
| High color | `V3.Undo.map.changeHotSpotHighColor`, `V3.Redo.…` | `changeHotSpotHighColor`, with `color` |

The color picker reports a change for each color the user tries, as it does for Fill Color, so each is its own
undo step.

## Model

`MapHotSpotModel` gains one property, and the defaults of two others change:

| Property | Type | Default | Was |
| --- | --- | --- | --- |
| `colorRamp` | enumeration: `heat`, `viridis`, `cividis`, `monochrome`, `custom` | `heat` | (new) |
| `lowColor` | string | `#fff3a3` | `#000000` |
| `highColor` | string | `#5b1a8c` | `#ffffff` |

A new action, `setColorRamp`, sets the property.

### Saved documents

- The v2 export already writes the whole hot spot snapshot under the point layer's `v3.hotSpot` when any
  property differs from its default, so `colorRamp` is saved and restored with no change to the importer or
  exporter. `ICodapV2MapHotSpotStorage` gains an optional `colorRamp`.
- No migration is written. The feature is flagged and unreleased. A document saved before this change has no
  `colorRamp`, so it opens with Heat. If it has saved colors, they become its custom colors.

## Color computation

A new module, `hot-spot-color-ramps.ts`, owns the list of ramps and turns a ramp into colors:

- `getHotSpotRampInterpolator(colorRamp, lowColor, highColor)` returns a function from a position in [0, 1] to a
  CSS color string.
  - Heat, Viridis and Cividis return d3's `interpolateInferno`, `interpolateViridis` and `interpolateCividis`.
    They are used in their standard direction, with the dark end at low density.
  - Monochrome returns `interpolateRgb("#000000", "#ffffff")`, which gives the same colors as before.
  - Custom returns `interpolateLab(lowColor, highColor)`. This is linear in CIELAB for the color and linear for
    alpha.
- `getHotSpotRampGradient(colorRamp, lowColor, highColor)` returns a CSS `linear-gradient` sampled from the
  interpolator at nine evenly spaced stops, for the preview strips.

`buildColorLUT` in `hot-spot-utils.ts` changes from taking two colors to taking an interpolator. It samples the
interpolator 256 times and applies the low-density fade to each entry's alpha, as it does now. The layer
component builds the lookup table from the model's `colorRamp`, `lowColor` and `highColor`, and redraws when any
of them changes.

### Why d3

d3 is already a dependency, and already includes the three named ramps and CIELAB interpolation. The alternative
considered was colord's `lab` plugin with hand-written stops for the named ramps. That adds a plugin to colord's
global configuration and requires maintaining tables of colors that d3 already ships.

`getChoroplethColors` in `color-utils.ts` is no longer used by the hot spot layer. It stays as it is, in RGB,
because the legend gradients use it.

### Effect of CIELAB on the custom ramp

With the default colors, the middle of the ramp is `rgb(178, 133, 156)` in CIELAB and `rgb(173, 135, 152)` in
RGB. The difference is larger between colors of very different hues: the midpoint of blue to yellow is
`rgb(193, 137, 172)` in CIELAB and gray, `rgb(128, 128, 128)`, in RGB.

## Files

| File | Change |
| --- | --- |
| `src/components/map/utilities/hot-spot-color-ramps.ts` | New: the ramp list, interpolators, preview gradients |
| `src/components/map/utilities/hot-spot-utils.ts` | `buildColorLUT` takes an interpolator |
| `src/components/map/models/map-hot-spot-model.ts` | `colorRamp`, `setColorRamp`, new default colors |
| `src/components/map/components/map-hot-spot-layer.tsx` | Build the lookup table from the ramp; redraw when it changes |
| `src/components/map/components/inspector-panel/map-hot-spot-control.tsx` | The three new rows |
| `src/components/map/components/inspector-panel/map-inspector.scss` | Row and preview strip styles |
| `src/v2/codap-v2-types.ts` | `colorRamp` in `ICodapV2MapHotSpotStorage` |
| `src/utilities/translation/lang/en-US.json5` | Labels, option names, undo and redo strings |

All paths are under `v3/`. Each changed source file's existing test file is updated with it, and the new module
gets `hot-spot-color-ramps.test.ts`.

## Test IDs

All extend the existing `map-hot-spot-` prefix, except the swatches, whose IDs come from `PointColorSetting`.

| Element | `data-testid` |
| --- | --- |
| Color select | `map-hot-spot-color-ramp-select` |
| Its button | `map-hot-spot-color-ramp-button` |
| Its popover | `map-hot-spot-color-ramp-popover` |
| Low color swatch button | `color-swatch-button-hot-spot-low` |
| High color swatch button | `color-swatch-button-hot-spot-high` |

## Out of scope

- Reversing a ramp.
- Custom ramps with more than two colors.
- Binned (stepped) ramps.
- A legend for the hot spot layer.
- Translations other than en-US.
