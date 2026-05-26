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
