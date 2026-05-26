import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kCaseTableTileType } from "../case-table/case-table-defs"

// V2 (titlebar_button_view.js) emits two distinct operations on the `component` resource when
// toggling between the case table and case card. The `type` reflects the source tile;
// updateTileNotification derives it from `tile.content.type` via kComponentTypeV3ToV2Map.
export function toggleCardTableNotification(sourceTile?: ITileModel) {
  if (!sourceTile) return
  const operation = sourceTile.content.type === kCaseTableTileType
    ? "toggle table to card"
    : "toggle card to table"
  return updateTileNotification(operation, {}, sourceTile)
}
