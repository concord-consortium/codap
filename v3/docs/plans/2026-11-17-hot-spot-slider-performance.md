# Hot Spot Resolution Slider Performance

## Context

Dragging the map hot spot resolution slider feels clunky. Every slider event (`onChange` →
`hotSpotModel.setDynamicBandwidth`) triggers expensive work. These notes come from reading the code, not
profiling, so the relative costs below are estimates. Profile before committing to any of the larger changes.

## Where the Time Goes

Each slider event does three expensive things:

1. **Recomputes the surface synchronously, without the debounce.** The `mstReaction` in
   `src/components/map/components/map-hot-spot-layer.tsx` reads `hotSpotModel.hotSpotSurface`, so
   `computeHotSpotSurface` runs on every slider event. Only the canvas redraw is debounced (10 ms).
2. **Runs mean-shift from every point** in `computeMaxDensity` (`src/components/map/utilities/hot-spot-utils.ts`).
   That's up to 50 iterations per point, each visiting all kernels in the neighboring buckets. For clustered data
   it approaches O(n²). This is probably the biggest cost for large datasets.
3. **Fills a grid four times the viewport's area.** `kHotSpotPadding = 0.5` adds half the viewport on every side.
   Each kernel touches about (6h / cellSize)² cells, so the cost grows with the square of the bandwidth, which is
   why wide settings feel worse.

## Done

### Skip the padding while dragging

`HotSpotCanvasLayer` has a settable padding (`setPadding`). `MapHotSpotLayer`'s debounced redraw uses a padding
of 0 while `dynamicBandwidth` is set, and `kHotSpotPadding` otherwise. That draws about a quarter of the cells
while dragging. Releasing the slider commits the bandwidth, which recomputes the surface and triggers a full
padded redraw. `updateTransform` uses the padding the canvas was drawn with, so zoom animations stay aligned.

Status: implemented, not yet evaluated in the browser. Tests and comments are pending until we confirm it's
worth keeping.

## Biggest Wins

### Approximate `maxDensity` while dragging

While `dynamicBandwidth` is set, replace the mean-shift search with a cheap estimate:

- the largest density at the points themselves (no mean-shift), or
- the largest cell in the computed grid.

Run the exact mean-shift once in `onChangeEnd`. Colors would shift slightly on release, since the estimate is a
lower bound on the true maximum, but dragging no longer pays for the slowest step.

### Recompute at most once per frame

Make the reaction only schedule a redraw, and read `hotSpotSurface` inside the draw function. Throttle redraws
with `requestAnimationFrame` instead of the 10 ms debounce. Intermediate bandwidths that never reach the screen
are then never computed, and the surface is built at most once per frame.

### 4×4 cells while dragging

Previously discussed: use `cellSize = 4` instead of `kHotSpotCellSize = 2` while dragging. Combined with skipping
the padding, that's about 16 times fewer cells than a full redraw. The next item is a more general version.

## Probably Worthwhile

### Choose the cell size from the bandwidth

Instead of fixing 4×4 while dragging, pick the cell size from the bandwidth in pixels, for example
`cellSize = clamp(hPixels / 3, 2, 16)`. A wide Gaussian is smooth, and the canvas is already stretched with
browser smoothing between cells (see `hot-spot-canvas-layer.ts`), so coarse cells look almost the same exactly
where the cost is highest. This could be permanent rather than drag-only.

Caveat: `computeDensityGrid` samples at cell centers, so cells must stay small relative to `h` to avoid missing
narrow kernels (see the known limitation in its doc comment). Tying the cell size to `h` respects that by
construction.

### Cache the projected world points

`computeHotSpotSurface` re-projects every lat/long with `latLongToWorldPoint` (Leaflet's EPSG:3857 CRS) on each
bandwidth change, even though only `h` changes. Cache the world positions as a separate computed view that
depends only on the plotted lat/longs, and derive the per-bandwidth `h` from them.

## Larger Changes

### Bin the points, then blur

Add the points to the grid as counts, then blur with a separable Gaussian: one 1D pass in x, then one in y. The
cost then depends on the number of cells times the kernel width rather than the number of points. The
`computeDensityGrid` doc comment already mentions binning as a future fix for narrow kernels. Varying `h` with
latitude (Mercator) complicates an exact blur, but within one view the variation is usually small.

### Move the work to a Web Worker

Compute the grid in a Web Worker and draw with `OffscreenCanvas`. The slider thumb would stay smooth even when
rendering falls behind, and stale frames could be dropped. This is a fair amount of plumbing (transferring
points, cancelling stale requests, bundling the worker with webpack), so it's worth it only if the other changes
aren't enough.

## Minor

### Cache the color lookup table

`buildColorLUT` runs on every draw in `map-hot-spot-layer.tsx`. Caching it by `lowColor` and `highColor` would
save a `getChoroplethColors` call per frame. Small, but simple.

## Next Steps

1. Evaluate the padding change in the browser.
2. Record a Chrome performance profile while dragging on a large dataset to see whether mean-shift or the grid
   dominates.
3. Based on that, approximate `maxDensity` while dragging and throttle recomputes to once per frame.
4. Then try bandwidth-based cell sizes.
5. Consider binning or a Web Worker only if dragging is still slow.
