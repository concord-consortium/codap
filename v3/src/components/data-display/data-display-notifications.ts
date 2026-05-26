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
