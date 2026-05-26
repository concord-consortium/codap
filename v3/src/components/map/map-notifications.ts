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
