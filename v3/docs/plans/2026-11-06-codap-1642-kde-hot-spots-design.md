# CODAP-1642: Kernel Density Hot Spots — Design & Implementation Plan

**Status:** Draft
**Jira:** [CODAP-1642](https://concord-consortium.atlassian.net/browse/CODAP-1642)
**Branch:** `codap-1642-kde-hot-spots`
**Builds on:** CODAP-1670 (hot spot infrastructure, PR #2772)

## Goal

Replace the placeholder in `MapHotSpotLayer` with a real hot spot display: a kernel density
surface computed from the visible points of a map point layer, drawn as a continuous
low-color → high-color gradient over the map.

## Background: what CODAP-1670 provided

- `MapHotSpotModel` (`src/components/map/models/map-hot-spot-model.ts`) with a single
  `isVisible` property, owned by `MapPointLayerModel.hotSpotModel`.
- `MapHotSpotLayer` (`src/components/map/components/map-hot-spot-layer.tsx`), rendered by
  `MapPointLayer`, gated by the `mapHotSpot` feature flag, layer visibility, and
  `hotSpotModel.isVisible`. It creates the `codapHotSpotPane` Leaflet pane (above the
  boundary polygons in `overlayPane`, below the PIXI point canvas) and currently draws a
  translucent white placeholder rectangle.
- Inspector toggle (`map-hot-spot-control.tsx`) and V2 import/export of the hot spot
  snapshot via the `v3` extension (`ICodapV2MapHotSpotStorage`).

## Requirements

1. New `MapHotSpotModel` properties with defaults (no UI to change them yet):
   - `bandwidth`: geographic distance in meters. `undefined` means "compute a default from
     the spatial spread of the data."
   - `opacity`: default `0.75`
   - `lowColor`: default black
   - `highColor`: default white
2. Density is computed on a pixel-space grid of square cells; the cell size (2px) lives in
   a constant so it can be tuned.
3. Gaussian kernel: `K(d) = exp(−d² / 2h²)` (unnormalized; each point contributes at most 1).
4. Only visible points contribute: hidden, set-aside, filtered-out, and cases lacking valid
   lat/long values are excluded.
5. Color mapping: density 0 → `lowColor`, maximum density **over all the data** (not just the
   viewport) → `highColor`, linear interpolation in between. Continuous, no binning.
6. Hot spots display whenever the layer and the hot spot toggle are on, **even if the points
   themselves are hidden** (`pointsAreVisible === false`).
7. Ignore legend grouping.
8. World copies: whatever is simplest. This design uses a single copy that matches the
   displayed points.

### Explicitly deferred (but the design should leave room)

- Arbitrary multi-stop gradients.
- Color binning (banded display).
- Density-dependent opacity (e.g., low densities more transparent).
- UI for bandwidth / opacity / colors.
- Per-legend-category surfaces.

## Design

### 1. Coordinate system and the density function

Because normalization uses the maximum over all the data, the density must not depend on
zoom or pan. We therefore define the density in **Web Mercator "world" coordinates at zoom 0**
(Leaflet's `map.project(latLng, 0)`, a 256 × 256 world), not in screen pixels:

```
f(x) = Σᵢ exp(−|x − pᵢ|² / 2hᵢ²)        (terms with |x − pᵢ| > kKernelCutoff · hᵢ are dropped)
```

- `pᵢ` is point *i* projected to zoom-0 world coordinates.
- `hᵢ` is the geographic bandwidth `h` (meters) converted to zoom-0 world units **at point i's
  latitude**: `hᵢ = h · 256 / (2π · R · cos(latᵢ))`, with `R = 6378137` (the EPSG:3857 radius
  Leaflet uses) and latitude clamped to Leaflet's Mercator limit (±85.0511°). The `1/cos(lat)`
  factor is the Mercator scale; it makes each kernel approximately a circle of radius `h` on
  the ground.
- `kKernelCutoff = 3` (≥ 99.7% of a Gaussian's mass). Truncation is applied identically in
  the max computation and the grid so normalization is consistent.

At zoom `z`, container pixels are zoom-0 world units × `2^z` plus a translation, so evaluating
`f` on the screen grid is just evaluating the same function with distances and bandwidths both
scaled by `2^z`. **The value at a given geographic location is identical at every zoom level**,
so the maximum can be computed once per data/bandwidth change and reused across pan and zoom.

### 2. Model changes

```ts
export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false,
  bandwidth: types.maybe(types.number),   // meters; undefined => computed default
  opacity: 0.75,
  lowColor: "#000000",
  highColor: "#ffffff"
})
```

- Colors are stored as hex strings and parsed with d3's `color()`/`rgb()` when building the
  color lookup table.
- No setters are added yet (nothing changes these values). They'll come with the UI story.
- `isDefaultHotSpotModel` keeps working: defaults appear in the default snapshot, and an
  unset `bandwidth` is omitted.
- `ICodapV2MapHotSpotStorage` (`src/v2/codap-v2-types.ts`) gains the four optional fields so
  the snapshot round-trips through V2 export/import.

### 3. Collecting the points

Source: `dataConfiguration.getCaseDataArray(0)` on the point layer's `dataConfiguration`.
`_filterCase` already excludes hidden cases, cases removed by the filter formula, and cases
with invalid lat/long values; set-aside cases never reach the data configuration. (Side
effect: "display only selected cases" also restricts the hot spots. This is consistent with
the points and seems right.)

For each case: read `lat`/`long` via `dataset.getNumeric(caseID, latId/longId)`.

### 4. Default bandwidth

Uses the ArcGIS Kernel Density default search radius, which is designed for geographic point
hot spot maps and is robust to spatial outliers:

```
h = 0.9 · min(SD, √(1/ln 2) · Dₘ) · n^(−0.2)
```

- **Mean center:** average of the points as 3D unit vectors, converted back to lat/long.
  This avoids the averaging-longitudes bug for data that crosses the antimeridian.
- **Dᵢ:** great-circle (haversine) distance in meters from point *i* to the mean center.
- **SD (standard distance):** `√(Σ Dᵢ² / n)`.
- **Dₘ:** median of the Dᵢ.
- **n:** number of visible points.

Degenerate cases:

| Situation | Behavior |
|---|---|
| `n = 0` | Draw nothing (no canvas content). |
| `Dₘ = 0` but `SD > 0` (more than half the points coincide) | Use `SD` in place of the min. |
| `SD = 0` (n = 1 or all points coincide) | Use `kFallbackBandwidthMeters` (see Open Questions). |

`effectiveBandwidth = hotSpotModel.bandwidth ?? computeDefaultBandwidth(points)`.

### 5. Maximum density (over all the data)

The maximum of a sum of Gaussians usually lies *between* points, not on one. For example, two
points 2h apart have `f = 1 + e⁻² ≈ 1.135` at each point but `2e^(−½) ≈ 1.213` at the midpoint.
Evaluating only at the data points would underestimate the max by several percent and wash
out the peaks to solid `highColor`.

We find the modes with **mean-shift**, which is a guaranteed hill-climb for Gaussian KDE:

```
x ← Σ (wᵢ / hᵢ²) · pᵢ  /  Σ (wᵢ / hᵢ²),     wᵢ = exp(−|x − pᵢ|² / 2hᵢ²)   (within cutoff)
```

- Start once from each data point, iterate until the step is < `1e-6 · h` or 50 iterations.
- `maxDensity = max(f(converged xⱼ), f(pⱼ))` over all starts. Including `f(pⱼ)` guarantees we
  never do worse than point evaluation.
- Neighbor lookup uses a spatial hash in zoom-0 world coordinates with bucket size
  `kKernelCutoff · max(hᵢ)`. Horizontal differences are wrapped into `[−128, 128]` so clusters
  straddling the antimeridian are measured correctly.
- At render time, normalized values are clamped to `[0, 1]` as a safety net.

Cost is roughly `n × iterations × neighbors`, which is fine for typical CODAP sizes (hundreds to
low thousands of points). Results are cached and recomputed only when the data or bandwidth
changes (see §8).

### 6. The density grid (per render)

```ts
export const kHotSpotCellSize = 2   // px per grid cell side
```

- Region: the map container plus padding (`kHotSpotPadding = 0.1` of each dimension on each
  side, as in Leaflet's `L.Canvas`), so a pan doesn't immediately expose an undrawn edge.
- Grid dimensions: `ceil(regionWidth / kHotSpotCellSize) × ceil(regionHeight / kHotSpotCellSize)`;
  densities are sampled at cell centers into a `Float32Array`.
- Point positions: `leafletMap.latLngToContainerPoint([lat, shiftLongitudeIntoView(long, west, east)])`,
  the same projection the points use, so the hot spots line up with the displayed points (a single
  world copy).
  - A utility function should be defined for this computation, and it should be used here and everywhere the projection is currently being used for points.
- Per-point pixel bandwidth: `hpxᵢ = hᵢ · 2^zoom`, equivalently
  `h / metersPerPixel(latᵢ, zoom)`.
- **Separable accumulation:** `exp(−(dx² + dy²)/2h²) = exp(−dx²/2h²) · exp(−dy²/2h²)`. For each point,
  precompute a column-weight array and a row-weight array over the cells within the cutoff
  window, then accumulate `grid[r][c] += row[r] · col[c]`. The inner loop is a multiply-add with
  no `exp`.

Rough budget: an 800 × 600 map with padding gives ~145k cells. A point with `hpx = 50` touches
~22k cells, so 1,000 points is ~22M multiply-adds, which is tens of milliseconds. If profiling shows
this is too slow for large `n` × large `hpx` (zoomed far in), add the fallback in Phase 5.

### 7. Colorizing and drawing

- **Color LUT:** 256 RGBA entries interpolated from `lowColor` to `highColor` (`d3.interpolateRgb`),
  alpha 255. `t = clamp(density / maxDensity, 0, 1)` (the minimum is 0) indexes the LUT.
  - *Future gradients* replace the two-stop interpolation with a multi-stop one.
  - *Future binning* quantizes `t` (or builds a stepped LUT).
  - *Future density-based opacity* sets the LUT's alpha channel. The LUT is the single place where
    these extensions plug in.
- **Drawing:** write the colors into an `ImageData` the size of the grid, `putImageData` it onto a
  canvas whose backing size is the grid size and whose CSS size is the grid size × `kHotSpotCellSize`.
  The browser's image smoothing then interpolates bilinearly between cells for free.
- **Overall opacity:** the canvas's CSS `opacity = hotSpotModel.opacity`.

Note: with the default black low color at 0.75 opacity, every area of the map away from the data
is darkened. This is intended.

### 8. Leaflet integration

A small `L.Layer` subclass, `HotSpotCanvasLayer` (`src/components/map/utilities/hot-spot-canvas-layer.ts`),
modeled on `L.Canvas`:

- `onAdd`: create the canvas in `codapHotSpotPane`. `onRemove`: remove it.
- `getEvents()`:
  - `moveend`, `zoomend`, and `resize`: reposition the canvas
    (`L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint(−padding))`) and request a redraw.
  - `zoomanim`: CSS-transform the existing canvas with `L.DomUtil.setTransform(canvas, offset, scale)`,
    as `L.Renderer._updateTransform` does, so it scales smoothly during the zoom animation.
  - During a drag the pane's own translation moves the canvas with the map; no redraw until `moveend`.
- `setDrawFunction(fn)` / `redraw()`: the layer owns the DOM and positioning, while the React component
  supplies the drawing callback (§6–7). This keeps the Leaflet layer free of CODAP model knowledge.

`MapHotSpotLayer` (React):

- Adds/removes the `HotSpotCanvasLayer` when `show` toggles (replacing the placeholder rectangle).
- **Data-dependent cache:** the points, effective bandwidth, zoom-0 projections, `hᵢ`, and
  `maxDensity`. This is recomputed when a `dataVersion` counter changes. The counter is bumped by the same triggers
  `MapPointLayer` uses for its points/heatmap: `caseDataHash` reaction, case-value-change actions,
  add/remove cases, and lat/long attribute type changes. During implementation, check whether a MobX
  computed over `getCaseDataArray(0)` + `getNumeric` already observes value changes; if so, a
  computed can replace the counter.
- **View-dependent redraw:** debounced (~10ms, like the heatmap) on data cache changes, model
  property changes (`bandwidth`, colors, `opacity`), and the layer's map events.

### 9. Constants

In `src/components/map/utilities/hot-spot-utils.ts`:

| Constant | Value | Purpose |
|---|---|---|
| `kHotSpotCellSize` | `2` | Grid cell side length in CSS px |
| `kKernelCutoff` | `3` | Kernel truncation radius, in bandwidths |
| `kHotSpotPadding` | `0.1` | Extra canvas margin around the viewport |
| `kFallbackBandwidthMeters` | TBD | Bandwidth when the spread is zero |
| `kEarthRadiusMeters` | `6378137` | Must match Leaflet EPSG:3857 |

## Files

**Create**

- `src/components/map/utilities/hot-spot-utils.ts`: pure functions: `computeDefaultBandwidth`,
  `bandwidthToWorldUnits`, `computeMaxDensity` (mean-shift + spatial hash), `computeDensityGrid`,
  `buildColorLUT`, `colorizeDensityGrid`; constants.
- `src/components/map/utilities/hot-spot-utils.test.ts`
- `src/components/map/utilities/hot-spot-canvas-layer.ts`: `L.Layer` subclass.
- `src/components/map/utilities/hot-spot-canvas-layer.test.ts`

**Modify**

- `src/components/map/models/map-hot-spot-model.ts` (+ test): new properties.
- `src/v2/codap-v2-types.ts`: extend `ICodapV2MapHotSpotStorage`.
- `src/components/map/v2-map-importer.test.ts`: round-trip with non-default fields.
- `src/components/map/components/map-hot-spot-layer.tsx` (+ test): real rendering.

## Testing

**Jest: pure functions (TDD)**

- `computeDefaultBandwidth`: a known small configuration against a hand-computed value; an outlier
  point barely changes the result (the median term wins); coincident points → fallback;
  `Dₘ = 0, SD > 0` → SD path; antimeridian-straddling cluster gives the same result as the same
  cluster shifted away from the dateline.
- `bandwidthToWorldUnits`: equator vs. 60° (2× larger); latitude clamping near the poles.
- `computeMaxDensity`: single point → 1; two points 2h apart → `2e^(−½)` within tolerance (mode
  between points); far-apart points → 1; cluster across the antimeridian is found.
- `computeDensityGrid`: single point peak at its cell ≈ 1; symmetric falloff; zero beyond the cutoff;
  matches the brute-force `exp` evaluation on a small grid; points just outside the region still
  contribute to edge cells.
- `buildColorLUT` / `colorizeDensityGrid`: 0 → lowColor, max → highColor, midpoint interpolates,
  values above max clamp.
- Zoom invariance: the grid value at a fixed lat/long is the same at two zoom levels.

**Jest: model and components**

- Model defaults; snapshot of a default model is still recognized by `isDefaultHotSpotModel`;
  V2 export/import round-trips non-default values.
- `MapHotSpotLayer`: canvas added to `codapHotSpotPane` when shown, removed when hidden or flag off;
  still shown when `pointsAreVisible` is false.

**Manual / Cypress**

- Visual check with US cities, a world dataset, a dataset crossing the antimeridian, and a
  ~5k-point dataset (timing logged).
- A light Cypress check that toggling hot spots adds/removes the canvas.

## Implementation Phases

1. **Model:** add properties, V2 types, tests.
2. **Math utilities (TDD):** bandwidth, projections, max density, grid, colorization.
3. **Canvas layer:** `HotSpotCanvasLayer` with positioning, zoom animation, and resize handling.
4. **Wire up:** `MapHotSpotLayer` data cache + redraw triggers; remove the placeholder.
5. **Performance pass:** profile large `n` and high zoom. If needed, add a fallback that bins
   points into the grid and applies a separable Gaussian blur (cost independent of `n`), used
   when `Σ(kernel window area)` exceeds a threshold. Consider throttled redraws during drag if
   the padded edge is noticeable.

## Open Questions

1. **`kFallbackBandwidthMeters`:** proposed 10 km for the single-point / all-coincident case. Is
   there a better choice (e.g., derived from the current map view)?
2. **Large-n budget:** at what dataset size should we accept slower recomputation of the max (mean-shift)
   vs. switching to a cheaper approximation?
