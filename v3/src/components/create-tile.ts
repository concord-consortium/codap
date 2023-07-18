import { createDefaultTileOfType } from "../models/codap/add-default-content"
import { IDocumentContentModel } from "../models/document/document-content"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { getPositionOfNewComponent } from "../utilities/view-utils"
import { kTitleBarHeight } from "./constants"

export function createTile(tileType: string, content?: IDocumentContentModel): ITileModel | undefined {
  const componentInfo = getTileComponentInfo(tileType)
  if (!componentInfo) return
  const width = componentInfo.defaultWidth
  const height = componentInfo.defaultHeight
  const row = content?.getRowByIndex(0)
  if (row) {
    const newTile = createDefaultTileOfType(tileType)
    if (newTile) {
      if (isFreeTileRow(row)) {
        const newTileSize = {width, height}
        const {x, y} = getPositionOfNewComponent(newTileSize)
        const tileOptions = { x, y, width, height }
        content?.insertTileInRow(newTile, row, tileOptions)
        const rowTile = row.tiles.get(newTile.id)
        if (componentInfo.defaultWidth && componentInfo.defaultHeight) {
          rowTile?.setSize(componentInfo.defaultWidth,  componentInfo.defaultHeight + kTitleBarHeight)
          rowTile?.setPosition(tileOptions.x, tileOptions.y)
        }
      }
      return newTile
    }
  }
}

export function toggleTileVisibility(tileType: string, content?: IDocumentContentModel) {
  const tiles = content?.getTilesOfType(tileType)
  if (tiles && tiles.length > 0) {
    const tileId = tiles[0].id
    content?.deleteTile(tileId)
  } else {
    return createTile(tileType, content)
  }
}

  export function createTileOfType(tileType: string, content?: IDocumentContentModel) {
    if (getTileComponentInfo(tileType)?.isSingleton) {
      toggleTileVisibility(tileType, content)
    } else {
      return createTile(tileType, content)
    }
  }
