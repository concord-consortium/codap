import { kCaseCardTileType } from "../case-card/case-card-defs"
import { ILogMessage, LogMessageFn } from "../../lib/log-message"
import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { INewTileOptions } from "../../models/codap/create-tile"
import { IDataSet } from "../../models/data/data-set"
import { createCasesNotification, updateCasesNotificationFromIds } from "../../models/data/data-set-notifications"
import { ICase } from "../../models/data/data-set-types"
import { setCaseValuesWithCustomUndoRedo } from "../../models/data/data-set-undo"
import { IDocumentContentModel } from "../../models/document/document-content"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import {
  ISharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata
} from "../../models/shared/shared-case-metadata"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { getSharedDataSetFromDataSetId, getTileCaseMetadata } from "../../models/shared/shared-data-utils"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { getSharedModelManager, getTileEnvironment } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { urlParams } from "../../utilities/url-params"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { kTitleBarHeight } from "../constants"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import { kCaseTableDefaultWidth, kDefaultColumnWidth, kDropzoneWidth, kIndexColumnWidth }
  from "../case-table/case-table-types"

export type kCardOrTableTileType = typeof kCaseTableTileType | typeof kCaseCardTileType

export interface ICaseTileContentModel extends ITileContentModel {
  data?: IDataSet
  metadata?: ISharedCaseMetadata
}

export function isCaseTileContentModel(tile?: ITileContentModel): tile is ICaseTileContentModel {
  return (!!tile && "data" in tile && "metadata" in tile)
}

export function createTableOrCardForDataset (
  sharedDataSet: ISharedDataSet, caseMetadata: ISharedCaseMetadata, tileType: kCardOrTableTileType = kCaseTableTileType,
  options?: INewTileOptions
) {
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

  const numAttributes = sharedDataSet.dataSet.attributes.length
  const width = options?.width ?? Math.min(kCaseTableDefaultWidth,
                          (numAttributes * kDefaultColumnWidth) + kDropzoneWidth + kIndexColumnWidth)

  const height = options?.height ?? (caseTableComponentInfo.defaultHeight || 0)
  let {x, y} = getPositionOfNewComponent({width, height})
  if (options?.x != null) x = options.x
  if (options?.y != null) y = options.y
  const tileOptions = { x, y, width, height: height + kTitleBarHeight, animateCreation: options?.animateCreation }
  content?.insertTileInRow(tile, row, tileOptions)
  uiState.setFocusedTile(tile.id)

  return tile
}

export function createOrShowTableOrCardForDataset (
  sharedDataSet: ISharedDataSet, tileType: kCardOrTableTileType = kCaseTableTileType, options?: INewTileOptions
) {
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
    } else if (content) {
      return toggleCardTable(content, existingTileId, options)
    }
  } else {  // We don't already have a card/table for this dataset
    return createTableOrCardForDataset(sharedDataSet, caseMetadata, tileType, options)
  }
}

// TileID is that of a case table or case card tile. Toggle its visibility and create and/or show the other.
// Returns the shown tile.
export function toggleCardTable(documentContent: IDocumentContentModel, tileID: string, _options?: INewTileOptions) {
  const tileModel = documentContent.getTile(tileID),
    tileLayout = documentContent.getTileLayoutById(tileID),
    tileType = tileModel?.content.type
  if (tileLayout && tileType && isFreeTileLayout(tileLayout) &&
      [kCaseCardTileType, kCaseTableTileType].includes(tileType)) {
    const otherTileType = tileType === kCaseTableTileType ? kCaseCardTileType : kCaseTableTileType,
      caseMetadata = getTileCaseMetadata(tileModel.content),
      datasetID = caseMetadata?.data?.id ?? "",
      sharedData = getSharedDataSetFromDataSetId(caseMetadata, datasetID),
      otherTileId = tileType === kCaseTableTileType
        ? caseMetadata?.caseCardTileId : caseMetadata?.caseTableTileId
    tileLayout.setHidden(true)
    if (otherTileId) {
      documentContent.toggleNonDestroyableTileVisibility(otherTileId)
      caseMetadata?.setLastShownTableOrCardTileId(otherTileId)
      return documentContent.getTile(otherTileId)
    } else {
      const componentInfo = getTileComponentInfo(otherTileType),
        { x, y } = tileLayout,
        options = { width: componentInfo?.defaultWidth, height: componentInfo?.defaultHeight, ..._options, x, y },
        otherTile = documentContent.createTile(otherTileType, options)
      if (otherTile && caseMetadata && sharedData) {
        if (tileType === kCaseTableTileType) {
          caseMetadata.setCaseCardTileId(otherTile.id)
        } else {
          caseMetadata.setCaseTableTileId(otherTile.id)
        }
        caseMetadata.setLastShownTableOrCardTileId(otherTile.id)
        const manager = getTileEnvironment(tileModel)?.sharedModelManager
        manager?.addTileSharedModel(otherTile.content, sharedData, true)
        manager?.addTileSharedModel(otherTile.content, caseMetadata, true)
      }
      return otherTile
    }
  }
}

export function applyCaseValueChanges(data: IDataSet, cases: ICase[], log?: ILogMessage | LogMessageFn) {
  const updatedCaseIds = cases.map(aCase => aCase.__id__)
  const newCaseIds: string[] = []
  data.applyModelChange(() => {
    if (cases.length > 0) {
      const allCaseIDs = new Set<string>(data.caseInfoMap.keys())
      setCaseValuesWithCustomUndoRedo(data, cases)

      // Changing values can result in new cases if grouping changes occur
      Array.from(data.caseInfoMap.keys()).forEach(caseId => {
        if (!allCaseIDs.has(caseId)) {
          newCaseIds.push(caseId)
        }
      })
    }
  }, {
    log,
    notify: () => {
      const notifications = []
      if (updatedCaseIds.length > 0) notifications.push(updateCasesNotificationFromIds(data, updatedCaseIds))
      if (newCaseIds.length > 0) notifications.push(createCasesNotification(newCaseIds, data))
      return notifications
    },
    undoStringKey: "DG.Undo.caseTable.editCellValue",
    redoStringKey: "DG.Redo.caseTable.editCellValue"
  })
}

export const colorCycleClass = (level: number, levelCount: number) => {
  const colorCycleCount = 5
  const levelIndex = urlParams.levelColors === "child-parent"
                      ? (levelCount - 1) - level
                      : level
  // e.g. `color-cycle-1`, `color-cycle-2`, etc.
  return `color-cycle-${levelIndex % colorCycleCount + 1}`
}
