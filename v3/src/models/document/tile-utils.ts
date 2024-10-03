import { appState } from "../app-state"
import { isFreeTileRow } from "./free-tile-row"

export function getTileInfo(tileId: string) {
  const row = appState.document.content?.findRowContainingTile(tileId)
  const freeTileRow = row && isFreeTileRow(row) ? row : undefined
  const dimensions = freeTileRow?.getTileDimensions(tileId)
  const position = freeTileRow?.getTilePosition(tileId)
  return { dimensions, position }
}
