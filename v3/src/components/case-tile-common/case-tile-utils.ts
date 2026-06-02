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
import { IDataSetMetadata } from "../../models/shared/data-set-metadata"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { getTileCaseMetadata } from "../../models/shared/shared-data-tile-utils"
import { getMetadataFromDataSet, getSharedDataSetFromDataSetId } from "../../models/shared/shared-data-utils"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { getSharedModelManager, getTileEnvironment } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import { isCaseTableModel } from "../case-table/case-table-model"
import {
  kCaseTableDefaultWidth, kDefaultColumnWidth, kDropzoneWidth, kIndexColumnWidth, kNewCaseTableDefaultWidth
} from "../case-table/case-table-types"
import { kTitleBarHeight } from "../constants"

export type kCardOrTableTileType = typeof kCaseTableTileType | typeof kCaseCardTileType

export interface ICaseTileContentModel extends ITileContentModel {
  data?: IDataSet
  metadata?: IDataSetMetadata
}

export function isCaseTileContentModel(tile?: ITileContentModel): tile is ICaseTileContentModel {
  return (!!tile && "data" in tile && "metadata" in tile)
}

export function createTableOrCardForDataset (
  sharedDataSet: ISharedDataSet, sharedMetadata: IDataSetMetadata, tileType: kCardOrTableTileType = kCaseTableTileType,
  options?: INewTileOptions
) {
  const document = appState.document
  const { content } = document
  const row = content?.getRowByIndex(0)
  const manager = getSharedModelManager(document)
  const caseTableComponentInfo = getTileComponentInfo(kCaseTableTileType)
  if (!content || !row || !caseTableComponentInfo) return

  const caseTableTileId = sharedMetadata.caseTableTileId
  if (caseTableTileId) {
    if (content?.isTileHidden(caseTableTileId)) {
      content?.toggleNonDestroyableTileVisibility(caseTableTileId)
    }
    return
  }

  const tile = createDefaultTileOfType(tileType, options)
  if (!tile) return

  manager?.addTileSharedModel(tile.content, sharedDataSet, true)
  manager?.addTileSharedModel(tile.content, sharedMetadata, true)
  if (tileType === kCaseTableTileType) {
    sharedMetadata.setCaseTableTileId(tile.id)
  } else {
    sharedMetadata.setCaseCardTileId(tile.id)
  }
  sharedMetadata.setLastShownTableOrCardTileId(tile.id)

  const numAttributes = sharedDataSet.dataSet.attributes.length
  let width = kCaseTableDefaultWidth
  if (options?.markNewlyCreated && numAttributes === 1) {
    width = kNewCaseTableDefaultWidth
    // If the table is newly created for a new dataset with one attribute, make the single column wider
    // so that the user can more easily see it and edit it.
    const caseTableModel = isCaseTableModel(tile.content) ? tile.content : undefined
    const firstAttrId = sharedDataSet.dataSet.attributes[0]?.id
    if (caseTableModel && firstAttrId) {
      caseTableModel.setColumnWidth(firstAttrId, kDefaultColumnWidth * 2)
    }
  }
  else {
    width = options?.width ??
      Math.min(kCaseTableDefaultWidth, (numAttributes * kDefaultColumnWidth) + kDropzoneWidth + kIndexColumnWidth)
  }

  const height = options?.height ?? (caseTableComponentInfo.defaultHeight || 0)
  let {x, y} = getPositionOfNewComponent({width, height})
  if (options?.x != null) x = options.x
  if (options?.y != null) y = options.y
  const tileOptions = { x, y, width, height: height + kTitleBarHeight, animateCreation: options?.animateCreation }
  content?.insertTileInRow(tile, row, tileOptions)
  uiState.setFocusedTile(tile.id)

  return tile
}

// Makes an existing (possibly hidden/minimized) tile visible and focused. Returns the tile, or
// undefined if no tile with the given id exists. Resolves the tile once (via getTile, which also
// accepts v2 numeric ids) and uses its canonical id for the subsequent layout/visibility calls.
function showExistingTile(content: IDocumentContentModel, tileId: string) {
  const tile = content.getTile(tileId)
  if (!tile) return undefined
  if (content.isTileHidden(tile.id)) {
    content.toggleNonDestroyableTileVisibility(tile.id)
  }
  const tileLayout = content.getTileLayoutById(tile.id)
  if (isFreeTileLayout(tileLayout) && tileLayout.isMinimized) {
    tileLayout.setMinimized(false)
  }
  uiState.setFocusedTile(tile.id)
  return tile
}

// Shows the case table or card for a dataset, creating it if necessary.
// When `tileType` is omitted (e.g. the tool-shelf "Tables" menu), the last-shown table/card view is
// restored as-is — fixing CODAP-1370, where re-opening a closed card incorrectly reverted to the table.
// When `tileType` is provided (e.g. a plugin creating a specific component), a tile of exactly that
// type is shown/created, regardless of which view was shown last.
export function createOrShowTableOrCardForDataset (
  sharedDataSet: ISharedDataSet, tileType?: kCardOrTableTileType, options?: INewTileOptions
) {
  const document = appState.document
  const { content } = document
  const metadata = getMetadataFromDataSet(sharedDataSet.dataSet)
  if (!sharedDataSet || !metadata || !content) return

  if (tileType == null) {
    // Restore mode: re-show whatever table/card was last visible for this dataset.
    const lastShownId = metadata.lastShownTableOrCardTileId
      || metadata.caseTableTileId || metadata.caseCardTileId
    const restored = lastShownId ? showExistingTile(content, lastShownId) : undefined
    if (restored) return restored
    return createTableOrCardForDataset(sharedDataSet, metadata, kCaseTableTileType, options)
  }

  // Ensure-type mode: show/create a tile of exactly the requested type.
  const sameTypeId = tileType === kCaseTableTileType ? metadata.caseTableTileId : metadata.caseCardTileId
  const shown = sameTypeId ? showExistingTile(content, sameTypeId) : undefined
  if (shown) return shown
  // The requested type doesn't exist yet; if the other type does, toggle to the requested type.
  const otherTypeId = tileType === kCaseTableTileType ? metadata.caseCardTileId : metadata.caseTableTileId
  if (otherTypeId && content.getTile(otherTypeId)) {
    return toggleCardTable(content, otherTypeId, options)
  }
  return createTableOrCardForDataset(sharedDataSet, metadata, tileType, options)
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
      metadata = getTileCaseMetadata(tileModel.content),
      datasetID = metadata?.data?.id ?? "",
      sharedData = getSharedDataSetFromDataSetId(metadata, datasetID),
      otherTileId = tileType === kCaseTableTileType
        ? metadata?.caseCardTileId : metadata?.caseTableTileId
    tileLayout.setHidden(true)
    if (otherTileId) {
      documentContent.toggleNonDestroyableTileVisibility(otherTileId)
      metadata?.setLastShownTableOrCardTileId(otherTileId)
      uiState.setFocusedTile(otherTileId)
      return documentContent.getTile(otherTileId)
    } else {
      const componentInfo = getTileComponentInfo(otherTileType),
        { x, y } = tileLayout,
        options = { width: componentInfo?.defaultWidth, height: componentInfo?.defaultHeight, ..._options, x, y },
        otherTile = documentContent.createTile(otherTileType, options)
      if (otherTile && metadata && sharedData) {
        if (tileType === kCaseTableTileType) {
          metadata.setCaseCardTileId(otherTile.id)
        } else {
          metadata.setCaseTableTileId(otherTile.id)
        }
        metadata.setLastShownTableOrCardTileId(otherTile.id)
        const manager = getTileEnvironment(tileModel)?.sharedModelManager
        manager?.addTileSharedModel(otherTile.content, sharedData, true)
        manager?.addTileSharedModel(otherTile.content, metadata, true)
      }
      return otherTile
    }
  }
}

export function applyCaseValueChanges(
  data: IDataSet, cases: ICase[], log?: ILogMessage | LogMessageFn, affectedAttributes?: string[]
) {
  // Skip no-op changes: when an editor commits a row whose values haven't actually
  // been edited (e.g. the auto-advanced cell editor on Enter being closed by a blur),
  // RDG still routes the close through onRowsChange. Without this guard, every such
  // commit creates a phantom undo entry that the user has to skip past.
  const hasChanges = cases.some(aCase => {
    const attrIds = affectedAttributes?.length
      ? affectedAttributes
      : Object.keys(aCase).filter(k => k !== "__id__")
    return attrIds.some(attrId => {
      const newValue = aCase[attrId]
      if (newValue === undefined) return false
      const newStr = newValue === null ? "" : String(newValue)
      // Coalesce to "" because getStrValue can return undefined in caching mode
      // (DataSet.getStrValueAtItemIndex returns cachedItem[attributeID]?.toString()).
      const currentStr = data.getStrValue(aCase.__id__, attrId) ?? ""
      return newStr !== currentStr
    })
  })
  if (!hasChanges) return
  const updatedCaseIds = cases.map(aCase => aCase.__id__)
  const newCaseIds: string[] = []
  data.applyModelChange(() => {
    if (cases.length > 0) {
      const allCaseIDs = new Set<string>(data.caseInfoMap.keys())
      setCaseValuesWithCustomUndoRedo(data, cases, affectedAttributes)

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
  // assign colors from child to parent (use levelIndex = level for parent to child)
  const levelIndex = (levelCount - 1) - level
  // e.g. `color-cycle-1`, `color-cycle-2`, etc.
  return `color-cycle-${levelIndex % colorCycleCount + 1}`
}
