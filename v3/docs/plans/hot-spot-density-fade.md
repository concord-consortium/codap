# Hot Spot Density Fade (CODAP-1671)

## Goal

Fade hot spot cells out at low density so that sparse areas of the map show the underlying map instead of a
solid wash of the low color.

- At or below **2%** of the maximum density, a cell is fully transparent (not rendered).
- At or above **35%** of the maximum density, a cell has the opacity set in `MapHotSpotModel.opacity`.
- In between, the opacity fades smoothly using smoothstep:

  ```
  x    = (density - floor) / (full - floor)
  fade = x² · (3 − 2x)
  ```

- The two cutoffs are named constants so they can be tuned later.

"Density" here means the normalized density, `density / maxDensity`, in [0, 1]. This is the value that already
picks each cell's color.

## How rendering works now

- [map-hot-spot-layer.tsx](../../src/components/map/components/map-hot-spot-layer.tsx) installs a draw function on
  a `HotSpotCanvasLayer`. On each redraw it builds a color lookup table with
  `buildColorLUT(lowColor, highColor)` and calls `renderHotSpotSurface`, which writes one RGBA pixel per grid cell
  into an `ImageData`.
- [hot-spot-utils.ts](../../src/components/map/utilities/hot-spot-utils.ts):
  - `buildColorLUT` returns 256 RGBA entries running from the low color to the high color.
  - `colorizeDensityGrid` maps each cell to LUT index `round(density / maxDensity · 255)`, clamped to 255.
- The model's `opacity` is not applied per cell. `HotSpotCanvasLayer.setOpacity`
  ([hot-spot-canvas-layer.ts](../../src/components/map/utilities/hot-spot-canvas-layer.ts)) sets it as CSS
  `opacity` on the whole canvas.

So today every cell, including ones with near-zero density, is drawn at the full model opacity.

## Design

### Constants and fade function (hot-spot-utils.ts)

```ts
/** At or below this fraction of the maximum density, hot spot cells are fully transparent */
export const kHotSpotFadeFloor = 0.02
/** At or above this fraction of the maximum density, hot spot cells have the full layer opacity */
export const kHotSpotFadeFull = 0.35

/**
 * Returns the opacity multiplier for a cell with the given normalized density (density / maxDensity):
 * 0 at or below kHotSpotFadeFloor, 1 at or above kHotSpotFadeFull, and smoothstep in between.
 */
export function hotSpotFade(normalizedDensity: number) {
  const x = Math.min(1, Math.max(0,
    (normalizedDensity - kHotSpotFadeFloor) / (kHotSpotFadeFull - kHotSpotFadeFloor)))
  return x * x * (3 - 2 * x)
}
```

Clamping `x` to [0, 1] produces the hard cutoffs: smoothstep is 0 at x = 0 and 1 at x = 1.

### Applying the fade: in the color lookup table

LUT entry `i` corresponds to normalized density `i / 255`, so the fade can be built into the LUT's alpha
channel:

```ts
lut.set([r, g, b, a * 255 * hotSpotFade(i / (kColorLUTSize - 1))], i * 4)
```

The canvas keeps the model's opacity as its CSS opacity, so a cell's final opacity is
`model opacity × fade × (alpha of the gradient color)`:

- density ≤ 2% → alpha 0, fully transparent
- density ≥ 35% → the model's opacity, exactly as today
- in between → smoothly scaled

Why the LUT:

- **No per-cell cost.** The fade is computed 256 times per redraw instead of once per cell (tens of thousands
  of cells).
- **No change to the render pipeline.** `colorizeDensityGrid`, `renderHotSpotSurface`, the canvas layer, and the
  React component keep their current structure. The `buildColorLUT` doc comment already names density-based
  opacity as something that plugs in here.
- **Opacity changes stay cheap.** Changing the opacity slider still only updates CSS opacity, with no redraw.

**Precision.** With 256 entries, normalized density is quantized in steps of 1/255 ≈ 0.39%. The 2% cutoff falls
between indices 5 (1.96%) and 6 (2.35%), so cells round to transparent at about 2.2% instead of exactly 2%.
Across the fade range the opacity change between neighboring entries is under 2%. This is visually
indistinguishable, and the browser's smoothing of the stretched canvas blurs it further. If exact cutoffs ever
matter, `colorizeDensityGrid` can compute the fade per cell instead.

**Transparent cells and smoothing.** Canvas pixel data is stored with premultiplied alpha, so a transparent
cell's RGB doesn't matter, and the browser's bilinear smoothing between transparent and opaque cells fades
the edges cleanly without dark fringes.

### Colors are unchanged

The color gradient still runs from the low color at density 0 to the high color at the maximum. The fade only
changes alpha. As a result, the visible range starts slightly above the low color (at 2% of the way along the
gradient), and the low color itself is never visible. This is intentional: the colors are not remapped to start
at the fade floor.

## Implementation plan

1. **`src/components/map/utilities/hot-spot-utils.ts`**
   - Add `kHotSpotFadeFloor`, `kHotSpotFadeFull`, and `hotSpotFade`.
   - In `buildColorLUT`, multiply each entry's alpha by `hotSpotFade(i / (kColorLUTSize - 1))`, and update its
     doc comment.
   - Update the `colorizeDensityGrid` doc comment to mention that low densities are transparent.
2. **No changes** to `map-hot-spot-model.ts`, `hot-spot-canvas-layer.ts`, or `map-hot-spot-layer.tsx`.
3. **No document format or V2 import/export changes.** The cutoffs are constants, not model properties.

## Testing plan

In `src/components/map/utilities/hot-spot-utils.test.ts`:

- **New `hotSpotFade` tests**
  - returns 0 at 0, at `kHotSpotFadeFloor`, and just below it
  - returns 1 at `kHotSpotFadeFull`, just above it, and at 1
  - returns 0.5 at the midpoint of the two cutoffs (smoothstep is symmetric)
  - never decreases across [0, 1] (sampled)
- **Update `buildColorLUT` tests**
  - Entry 0 is now `[0, 0, 0, 0]` instead of `[0, 0, 0, 255]`. Entries at or above 35% (index ≥ 90) keep full
    alpha. A mid-fade entry has alpha `round(255 · hotSpotFade(i / 255))`.
  - The low and high color alpha test (`#ff000000` → `#ff0000ff`) still holds at both ends. Add a check that the
    gradient's alpha and the fade multiply.
- **Update `colorizeDensityGrid` and `renderHotSpotSurface` expectations** that assert alpha 255 for
  zero-density cells ("far corner: no density, so the low color") to expect alpha 0. Brightness assertions read
  only the red channel and are unaffected.

Then run `npm test -- hot-spot`, `npm test -- map-hot-spot`, `npm run lint`, and `npm run build:tsc`, and check
in the browser that sparse areas show the base map and dense areas look as they do now.

## Decisions

- **Colors are not remapped to the fade floor.** The gradient keeps spanning density 0 to the maximum, and it's
  acceptable that the low color is never visible.

## Notes

- **Legend.** If a hot spot legend is added later, it should show the transparent range below 2%. Nothing to
  do now.
