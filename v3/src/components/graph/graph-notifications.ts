import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kGraphTileType } from "./graph-defs"

// V2 emits { action:'notify', resource:'component', values:{ operation:'change background color',
// type:'DG.GraphView' } } from apps/dg/components/graph/graph_controller.js (createSetColorAndAlphaCommand,
// ~line 772) when the user picks a color in the inspector palette. V3 additionally carries `to: <color>`
// so V3-aware plugins can see the resulting color without re-querying.
// No-ops for non-graph tiles so it's safe to call from generic notify callbacks.
export function changeBackgroundColorNotification(graphTile: ITileModel | undefined, to: string) {
  if (graphTile?.content.type !== kGraphTileType) return
  return updateTileNotification("change background color", { to }, graphTile)
}
