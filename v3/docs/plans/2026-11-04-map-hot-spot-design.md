# CODAP-1670: Map hot spot infrastructure — Design

**Status:** Approved
**Jira:** [CODAP-1670](https://concord-consortium.atlassian.net/browse/CODAP-1670)
**Branch:** `codap-1670-hot-spot-infrastructure`

## Goal

Lay the groundwork for map hot spots: a feature flag, a per-point-layer model, an
inspector control, and a placeholder map layer. Later work will replace the
placeholder with real hot spot rendering and add settings to the model.

## Feature flag

Add `mapHotSpot` to `kFeatureFlags` in `src/models/feature-flags/feature-flag-registry.ts`:

| field | value |
|---|---|
| description | "Hot spot layer on the map" |
| owner | `MappingTime` |
| added | `2026-11-04` |
| expires | `2027-11-30` |

Following the affordance rule in `docs/feature-flags.md`, the model is always
registered; only the inspector control and the drawn layer read the flag.

## Model

New file `src/components/map/models/map-hot-spot-model.ts`, styled like
`MapGridModel`:

```ts
export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false
})
  .actions(self => ({
    setIsVisible(isVisible: boolean) { self.isVisible = isVisible }
  }))
  .actions(applyModelChange)
```

`MapPointLayerModel` gains
`hotSpotModel: types.optional(MapHotSpotModel, () => MapHotSpotModel.create())`.

- Existing documents load unchanged (defaults to hidden). New saves include
  `hotSpotModel: { isVisible: false }` on each point layer.
- No v2 import/export: v2 has no counterpart.
- No flag-off test is needed: with the flag off, nothing reads `isVisible`, so a
  document saved with it on is inert rather than broken.

## Inspector control

In the map layers palette (`map-layers-palette.tsx`), each point layer's block gets a
new `MapHotSpotControl` after its `DisplayItemFormatControl`. When
`isFeatureEnabled("mapHotSpot")`, it renders a divider (a `border-top` matching the
existing between-layer separator) and a `PaletteCheckbox` labeled "Hot spot". When the
flag is off it renders nothing.

Toggling goes through `hotSpotModel.applyModelChange` with undo/redo strings
(`V3.Undo.map.showHotSpot` / `hideHotSpot` and the `Redo` pair) and a log message.
The label string is `V3.Inspector.map.hotSpot`.

There is one section per point layer, matching the per-layer model.

## Map layer (placeholder)

Approaches considered:

- **A — custom Leaflet pane (chosen).** Boundary polygons (and the georaster and grid
  rectangles) live in Leaflet's `overlayPane` inside the map pane; points are drawn
  on a canvas (`.map-dot-area`, z-index 11) that sits above the whole map pane
  (CODAP's CSS sets every `.leaflet-pane` to z-index 10). A custom pane inside the map
  pane, positioned immediately after `overlayPane` in the DOM, is therefore above the
  boundaries and below the points. It pans and zooms with the map, and the real hot
  spot rendering can draw into the same pane later.
- B — HTML overlay between z-index 10 and 11. Needs z-index renumbering and doesn't
  track the map.
- C — draw into the point renderer's canvas. Couples to the renderer.

Details for A:

- Pane name `codapHotSpotPane`, created on demand with `leafletMap.createPane()` and
  moved to just after `overlayPane`. Appending it at the end would put it above the
  popup pane (all panes share z-index 10, so DOM order decides) and cover the grid
  hover popup.
- The pane has `pointer-events: none` and the placeholder is non-interactive, so
  clicks reach the polygons beneath.
- Placeholder: one `L.rectangle` spanning the world (longitudes widened so repeated
  world copies at low zoom are covered), white fill at 0.5 opacity, no stroke.
- New component `MapHotSpotLayer`, rendered by `MapPointLayer` next to
  `MapPointGrid`. It draws when the flag is on, the point layer is visible, and
  `hotSpotModel.isVisible` is true.
- Grid rectangles are in `overlayPane`, so they sit under the hot spot layer. That is
  consistent with "above boundaries, below points".

## Testing

Test only what outlasts the placeholder:

- `MapHotSpotModel`: `isVisible` defaults to false, can be set, and round-trips
  through a `MapPointLayerModel` snapshot.
- `MapHotSpotControl`: renders nothing with the flag off; with the flag on, shows the
  checkbox and toggling it updates the model.

No tests for the placeholder rectangle or pane ordering.
