import { appState } from "../app-state"
import { isFreeTileRow } from "./free-tile-row"

export function getFreeTileLayout(tileId: string) {
  const documentContent = appState.document.content
  const rowId = documentContent?.findRowIdContainingTile(tileId)
  if (rowId != null) {
    const row = documentContent?.getRow(rowId)
    if (row && isFreeTileRow(row)) {
      return row.tiles.get(tileId)
    }
  }
}
