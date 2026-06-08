import { AttributeBinningType } from "../../models/shared/data-set-metadata"
import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { GraphPlace } from "../axis-graph-shared"

// Shared notification helpers for the graph and map tiles (the V3 "data-display" tiles).
// Callers are responsible for invoking these only where contextually appropriate — these
// helpers do NOT guard on tile type, since data-display must not depend on graph or map.

// V2 emits `swap categories` from apps/dg/components/graph/axes/cell_axis_view.js (endDrag
// ~:198) when a user finishes dragging a category label on a graph's categorical axis to a
// new position. V2's analogous LEGEND swap command at apps/dg/components/graph_map_common/
// legend/categories_view.js ~:120 has no `executeNotification` block — a V2 oversight (the
// undo/redo strings line up; only the notification is missing). V3 fires the same op from
// both code paths, additionally carrying `place` so plugins can distinguish axis vs legend
// (and which axis). The legend code is shared between graph and map; V2 map also did not
// emit for legend swap, so this V3 emission additionally closes the V2 map gap.
export function swapCategoriesNotification(tile: ITileModel | undefined, place: GraphPlace) {
  return updateTileNotification("swap categories", { place }, tile)
}

// V2 emits `change point size` from apps/dg/components/map/map_controller.js (~:492) when
// the user moves the point-size slider in the map inspector. Bare V2 payload
// (`type: "DG.MapView"`, no value). V3 additionally carries `to: <multiplier>` so plugins
// see the new value without re-querying.
//
// V3's point-size slider lives in data-display/inspector/ and is shared between graph and
// map. V2 graph does NOT emit this op, but V3 emits unconditionally from the shared slider
// (V3-additive for graph). Callers in data-display are responsible for invoking only where
// appropriate; the helper itself does not branch on tile type.
export function changePointSizeNotification(tile: ITileModel | undefined, to: number) {
  return updateTileNotification("change point size", { to }, tile)
}

// V2 emits `toggle stroke same as fill` from apps/dg/components/map/map_controller.js at
// TWO sites (~:640 point-layer checkbox, ~:862 polygon-layer checkbox) — both fire the
// same op string with a bare payload. V3 has a single shared PaletteCheckbox in
// data-display-inspector/display-item-format-control.tsx that handles both layer types,
// so there's only one V3 wiring site. V3 additionally carries `{ isChecked }` matching
// the AdornmentCheckbox convention CODAP-1351 used for other boolean toggles.
//
// V2 graph does NOT emit this op; V3 emits unconditionally from the shared checkbox
// (V3-additive for graph). Same no-tile-type-guard pattern as changePointSizeNotification.
export function toggleStrokeSameAsFillNotification(tile: ITileModel | undefined, isChecked: boolean) {
  return updateTileNotification("toggle stroke same as fill", { isChecked }, tile)
}

// V2 emits `change point color` from apps/dg/components/map/map_controller.js (~:294, inside
// `setCategoryColor`) when the user picks a color for a single category in a categorical
// legend. Bare V2 payload (`type: "DG.MapView"`, no color/category). V3 additionally carries
// `{ color, category }` so plugins can see which category got which color without
// re-querying.
export function changePointColorNotification(
  tile: ITileModel | undefined, color: string, category: string
) {
  return updateTileNotification("change point color", { color, category }, tile)
}

// V2 emits the COMPOUND op string `"change " + <internalName>` from the factory
// `createSetColorAndAlphaCommand` at apps/dg/components/map/map_controller.js (~:327, op at
// :337). For the non-categorical point color picker, V2 invokes the factory with the
// `"changePointColor"` internal command name, producing the op string
// `"change changePointColor"`. The op string is leaky V2 nomenclature — preserved for V2
// compat. Bare V2 payload; V3 additionally carries `{ color }`.
export function changePointColorAndAlphaNotification(tile: ITileModel | undefined, color: string) {
  return updateTileNotification("change changePointColor", { color }, tile)
}

// V2 emits the compound op `"change changeStrokeColor"` (same factory at map_controller.js
// ~:327, op at :337) when the user picks a stroke color in the point-layer inspector. As
// with changePointColor, the op string is leaky V2 internal nomenclature — preserved for
// compat. V2 payload is bare; V3 additionally carries `{ color }`.
export function changeStrokeColorAndAlphaNotification(tile: ITileModel | undefined, color: string) {
  return updateTileNotification("change changeStrokeColor", { color }, tile)
}

// V2 emits `change attribute color` from apps/dg/components/map/map_controller.js (~:370,
// via createSetAttributeColorCommand factory) when the user picks a color for the LOW or
// HIGH end of the numeric attribute color spectrum. V2 fires the same op for both ends
// with a bare payload — the "low"/"high" distinction lives only in V2's log message, not
// in the notification. V3 additionally carries `{ color, end }` so plugins can tell which
// end was changed.
export function changeAttributeColorNotification(
  tile: ITileModel | undefined, color: string, end: "low" | "high"
) {
  return updateTileNotification("change attribute color", { color, end }, tile)
}

// The numeric-legend range/bins controls (CODAP-1292/1293) are V3-only — V2 had no inspector
// UI for them, so there is no V2 op string to match. These V3-additive notifications let plugins
// observe legend-configuration edits. The controls are shared between graph and map, so the
// helpers carry no tile-type assumptions (the caller wires them only on a numeric legend).

// Emitted when the user changes the number of bins for a numeric legend. Carries the effective
// (clamped) bin count.
export function changeLegendBinCountNotification(tile: ITileModel | undefined, binCount: number) {
  return updateTileNotification("change legend bin count", { binCount }, tile)
}

// Emitted when the user edits the numeric-legend range (Min/Max). Carries the resulting effective
// bounds (the user override, else the live data extent); a bound is undefined only when the legend
// attribute has no numeric values (so the data extent itself is undefined).
export function changeLegendRangeNotification(
  tile: ITileModel | undefined, min?: number, max?: number
) {
  return updateTileNotification("change legend range", { min, max }, tile)
}

// Emitted when the user changes the numeric-legend bins type (Linear/Quantile, i.e. the
// quantize/quantile binning type).
export function changeLegendBinsTypeNotification(
  tile: ITileModel | undefined, binningType: AttributeBinningType
) {
  return updateTileNotification("change legend bins type", { binningType }, tile)
}
