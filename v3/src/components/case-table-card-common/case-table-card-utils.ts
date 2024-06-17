import { kCaseCardTileType } from "../case-card/case-card-defs"
import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { INewTileOptions } from "../../models/codap/create-tile"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import {
  ISharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata
} from "../../models/shared/shared-case-metadata"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { ComponentRect } from "../../utilities/animation-utils"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { kTitleBarHeight } from "../constants"
import { kCaseTableTileType } from "../case-table/case-table-defs"

export type kCardOrTableTileType = typeof kCaseTableTileType | typeof kCaseCardTileType

export const createTableOrCardForDataset = (
  sharedDataSet: ISharedDataSet, caseMetadata: ISharedCaseMetadata, tileType: kCardOrTableTileType = kCaseTableTileType,
  options?: INewTileOptions
) => {
  const document = appState.document
  const { content } = document
  const row = content?.getRowByIndex(0)
  const manager = getSharedModelManager(document)
  const caseTableComponentInfo = getTileComponentInfo(kCaseTableTileType)
  if (!content || !row || !caseTableComponentInfo) return

  const caseTableTileId = caseMetadata.caseTableTileId
  if (caseTableTileId) {
    content?.toggleNonDestroyableTileVisibility(caseTableTileId)
    return
  }

  const tile = createDefaultTileOfType(tileType, options)
  if (!tile) return

  manager?.addTileSharedModel(tile.content, sharedDataSet, true)
  manager?.addTileSharedModel(tile.content, caseMetadata, true)
  if (tileType === kCaseTableTileType) {
    caseMetadata.setCaseTableTileId(tile.id)
  } else {
    caseMetadata.setCaseCardTileId(tile.id)
  }
  caseMetadata.setLastShownTableOrCardTileId(tile.id)

  const width = caseTableComponentInfo.defaultWidth || 0
  const height = caseTableComponentInfo.defaultHeight || 0
  let {x, y} = getPositionOfNewComponent({width, height})
  if (options?.x != null) x = options.x
  if (options?.y != null) y = options.y
  const from: ComponentRect = { x: 0, y: 0, width: 0, height: kTitleBarHeight },
    to: ComponentRect = { x, y, width, height: height + kTitleBarHeight}
  content?.insertTileInRow(tile, row, from)
  uiState.setFocusedTile(tile.id)
  const tileLayout = content.getTileLayoutById(tile.id)
  if (!isFreeTileLayout(tileLayout)) return
  // use setTimeout to push the change into a subsequent action
  setTimeout(() => {
    // use applyModelChange to wrap into a single non-undoable action without undo string
    content.applyModelChange(() => {
      tileLayout.setPosition(to.x, to.y)
      tileLayout.setSize(to.width, to.height)
    })
  })

  return tile
}

export const createOrShowTableOrCardForDataset = (
  sharedDataSet: ISharedDataSet, tileType: kCardOrTableTileType = kCaseTableTileType, options?: INewTileOptions
) => {
  const document = appState.document
  const { content } = document
  const manager = getSharedModelManager(document)
  const caseMetadatas = manager?.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
  const caseMetadata = caseMetadatas?.find(cm => cm.data?.id === sharedDataSet?.dataSet.id)
  if (!sharedDataSet || !caseMetadata) return
  
  const existingTileId = caseMetadata.lastShownTableOrCardTileId
  if (existingTileId) { // We already have a case card/table so make sure it's visible and has focus
    const existingTile = content?.getTile(existingTileId)
    if (existingTile?.content.type === tileType) {
      if (content?.isTileHidden(existingTileId)) {
        content?.toggleNonDestroyableTileVisibility(existingTileId)
      }
      uiState.setFocusedTile(existingTileId)
      return content?.tileMap.get(existingTileId)
    } else {
      return content?.toggleCardTable(existingTileId, options)
    }
  } else {  // We don't already have a card/table for this dataset
    return createTableOrCardForDataset(sharedDataSet, caseMetadata, tileType, options)
  }
}
