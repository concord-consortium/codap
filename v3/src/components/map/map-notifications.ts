import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kMapTileType } from "./map-defs"
import { BaseMapKey } from "./map-types"

// V2 emits `change base map` from apps/dg/components/map/map_view.js (~:207) when the user
// picks a different base layer (oceans / topo / streets) from the segmented background control
// in the map inspector. Bare V2 payload (`type: "DG.MapView"`, no `to`). V3 additionally
// carries `to: <layerName>` so plugins can see which layer was selected without re-querying.
// No-ops for non-map tiles so it's safe to call from generic notify callbacks.
export function changeBaseMapNotification(mapTile: ITileModel | undefined, to: BaseMapKey) {
  if (mapTile?.content.type !== kMapTileType) return
  return updateTileNotification("change base map", { to }, mapTile)
}

// V2 emits `change grid size` from apps/dg/components/map/map_view.js (~:247) when the user
// releases the grid-size slider thumb (the persisted-value observer fires only on drag end,
// not on every intermediate value). Bare V2 payload (`type: "DG.MapView"`, no `from`/`to`).
// V3 additionally carries `{ from, to }` so plugins can see the pre- and post-drag values
// without re-querying. No-ops for non-map tiles.
export function changeGridSizeNotification(mapTile: ITileModel | undefined, from: number, to: number) {
  if (mapTile?.content.type !== kMapTileType) return
  return updateTileNotification("change grid size", { from, to }, mapTile)
}

// V2 emits `hide selected cases`, `hide unselected cases`, and `show all cases` from
// apps/dg/components/map/map_model.js (:534, :562, :598). These are MAP-SPECIFIC op strings
// (with spaces) — distinct from the graph's `hideSelected`/`hideUnselected`/`showAllCases`
// (camelCase) emitted from graph_map_common/data_layer_model.js. V3 must preserve the map's
// spaced strings so V2 plugins listening for the map ops continue to match.
//
// V2 emits a bare payload for all three. V3 additionally carries `numberHidden` on the two
// hide ops for parity with the graph's analogous notifications (V2 graph already does this;
// the map's omission is a V2 inconsistency, additive in V3 so plugins can ignore).
// No-ops for non-map tiles.
export function hideSelectedCasesNotification(mapTile: ITileModel | undefined, numberHidden: number) {
  if (mapTile?.content.type !== kMapTileType) return
  return updateTileNotification("hide selected cases", { numberHidden }, mapTile)
}

export function hideUnselectedCasesNotification(mapTile: ITileModel | undefined, numberHidden: number) {
  if (mapTile?.content.type !== kMapTileType) return
  return updateTileNotification("hide unselected cases", { numberHidden }, mapTile)
}

export function showAllCasesNotification(mapTile: ITileModel | undefined) {
  if (mapTile?.content.type !== kMapTileType) return
  return updateTileNotification("show all cases", {}, mapTile)
}
