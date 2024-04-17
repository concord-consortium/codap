import iframePhone from "iframe-phone"
import { Instance, SnapshotIn } from "mobx-state-tree"
import { BaseDocumentContentModel } from "./base-document-content"
import { isFreeTileLayout, isFreeTileRow } from "./free-tile-row"
import { kTitleBarHeight } from "../../components/constants"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { getTileComponentInfo } from "../tiles/tile-component-info"
import { getFormulaManager, getSharedModelManager, getTileEnvironment } from "../tiles/tile-environment"
import { getTileContentInfo } from "../tiles/tile-content-info"
import { ITileModel, ITileModelSnapshotIn } from "../tiles/tile-model"
import { typedId } from "../../utilities/js-utils"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { DataSet, IDataSet, IDataSetSnapshot, toCanonical } from "../data/data-set"
import { gDataBroker } from "../data/data-broker"
import { applyUndoableAction } from "../history/apply-undoable-action"
import { SharedCaseMetadata } from "../shared/shared-case-metadata"
import { ISharedDataSet, SharedDataSet, kSharedDataSetType } from "../shared/shared-data-set"
import { getSharedDataSets, linkTileToDataSet } from "../shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"

/**
 * The DocumentContentModel is the combination of 2 parts:
 * - BaseDocumentContentModel
 * - DocumentContentModel which currently contains CODAP-specific extensions
 *
 * These parts were split out so we could reduce the size of a single
 * document content model file. This splitting is constrained by a couple
 * of factors:
 * - the code needs to support actions that can apply "atomically" to the
 *   MST tree. This requires the actions are defined on a model in the tree.
 * - the code in each split out part should be able to use Typescript to
 *   to make sure it is working with the core or base document content model
 *   correctly.
 *
 * In the future it might make sense to switch to a types.compose(...) approach
 * this way multiple document content features can be put in different files
 * without having each feature depend on another feature.
 *
 * Note: the name "DocumentContent" is important because it is used in other
 * parts of the code to find a MST parent with this name.
 */
export interface IImportDataSetOptions {
  createDefaultTile?: boolean // default true
  defaultTileType?: string    // default kCaseTableTileType
}

export interface INewTileOptions {
  height?: number
  width?: number
}

export const DocumentContentModel = BaseDocumentContentModel
  .named("DocumentContent")
  .actions(self => ({
    async prepareSnapshot() {
      // prepare each row for serialization
      self.rowMap.forEach(row => row.prepareSnapshot())

      // prepare each tile for serialization
      const promises: Promise<void>[] = []
      self.tileMap.forEach(tile => promises.push(tile.prepareSnapshot()))
      await Promise.all(promises)

      // prepare each data set for serialization
      const sharedDataSets = getSharedDataSets(self)
      sharedDataSets.forEach(model => model.dataSet.prepareSnapshot())
    },
    completeSnapshot() {
      // complete serialization for each data set
      const sharedDataSets = getSharedDataSets(self)
      sharedDataSets.forEach(model => model.dataSet.completeSnapshot())

      // complete serialization for each tile
      self.tileMap.forEach(tile => tile.completeSnapshot())

      // complete serialization for each row
      self.rowMap.forEach(row => row.completeSnapshot())
    },
    createDefaultTileSnapshotOfType(tileType: string): ITileModelSnapshotIn | undefined {
      const env = getTileEnvironment(self)
      const info = getTileContentInfo(tileType)
      const id = typedId(info?.prefix || "TILE")
      const content = info?.defaultContent({ env })
      return content ? { id, content } : undefined
    },
    broadcastMessage(message: DIMessage, callback: iframePhone.ListenerCallback) {
      const tileIds = self.tileMap.keys()
      if (tileIds) {
        Array.from(tileIds).forEach(tileId => {
          self.tileMap.get(tileId)?.content.broadcastMessage(message, callback)
        })
      }
    }
  }))
  .actions(self => ({
    createDataSet(snapshot?: IDataSetSnapshot, providerId?: string) {
      const sharedModelManager = getSharedModelManager(self)
      // DataSets must have unique names
      const baseDataSetName = snapshot?.name || t("DG.AppController.createDataSet.name")
      const baseCollectionName = snapshot?.ungrouped?.name || t("DG.AppController.createDataSet.collectionName")
      const ungrouped = { name: baseCollectionName, ...snapshot?.ungrouped }
      let name = baseDataSetName
      const existingNames = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
                              .map((sharedModel: ISharedDataSet) => sharedModel.dataSet.name) ?? []
      for (let i = 2; existingNames.includes(name); ++i) {
        name = `${baseDataSetName} ${i}`
      }
      const dataSet: IDataSetSnapshot = { ...snapshot, name, ungrouped }
      const sharedDataSet = SharedDataSet.create({ providerId, dataSet })
      sharedModelManager?.addSharedModel(sharedDataSet)

      const caseMetadata = SharedCaseMetadata.create()
      sharedModelManager?.addSharedModel(caseMetadata)
      caseMetadata.setData(sharedDataSet.dataSet)

      return { sharedDataSet, caseMetadata }
    },
    createTile(tileType: string, options?: INewTileOptions): ITileModel | undefined {
      const componentInfo = getTileComponentInfo(tileType)
      if (!componentInfo) return
      const width = options?.width ?? componentInfo.defaultWidth
      const height = options?.height ?? componentInfo.defaultHeight
      const row = self.getRowByIndex(0)
      if (row) {
        const newTileSnapshot = self.createDefaultTileSnapshotOfType(tileType)
        if (newTileSnapshot) {
          if (isFreeTileRow(row)) {
            const newTileSize = {width, height}
            const {x, y} = getPositionOfNewComponent(newTileSize)
            const tileOptions = { x, y, width, height }
            const newTile = self.insertTileSnapshotInRow(newTileSnapshot, row, tileOptions)
            if (newTile) {
              const rowTile = row.tiles.get(newTile.id)
              if (width && height) {
                rowTile?.setSize(width, height + kTitleBarHeight)
                rowTile?.setPosition(tileOptions.x, tileOptions.y)
              }
              return newTile
            }
          }
        }
      }
    }
  }))
  .actions(self => ({
    toggleSingletonTileVisibility(tileType: string) {
      const tiles = self?.getTilesOfType(tileType)
      // There's supposed to be at most one tile of this type. Enforce this. (But an assert would be nice!)
      if (tiles.length > 1) {
        console.error("DocumentContent.toggleSingletonTileVisibility:",
                      `encountered ${tiles.length} tiles of type ${tileType}`)
      }
      if (tiles && tiles.length > 0) {
        const tileLayout = self.getTileLayoutById(tiles[0].id)
        if (isFreeTileLayout(tileLayout)) {
          tileLayout.setHidden(!tileLayout.isHidden)
        }
      } else {
        return self.createTile(tileType)
      }
    }
  }))
  .actions(self => ({
    createOrShowTile(tileType: string, options?: INewTileOptions) {
      const tileInfo = getTileContentInfo(tileType)
      if (tileInfo) {
        if (tileInfo.isSingleton) {
          self.toggleSingletonTileVisibility(tileType)
        } else {
          return self.createTile(tileType, options)
        }
      }
    }
  }))
  .actions(self => ({
    createStarterDataset() {
      const attributeName = t("DG.AppController.createDataSet.initialAttribute")
      const newData = [{[attributeName]: ""}]
      const ds = DataSet.create({ name: t("DG.AppController.createDataSet.name")})
      ds.addAttribute({ name: attributeName })
      ds.addCases(toCanonical(ds, newData))
      gDataBroker.addDataSet(ds)
      // Add dataset to the formula manager
      getFormulaManager(self)?.addDataSet(ds)
    },
    importDataSet(data: IDataSet, options?: IImportDataSetOptions) {
      const { createDefaultTile = true, defaultTileType = kCaseTableTileType } = options || {}
      // add data set
      const { sharedData } = gDataBroker.addDataSet(data)
      if (sharedData.dataSet && createDefaultTile) {
        // create the corresponding case table
        const newTile = self.createOrShowTile(defaultTileType)
        if (newTile) {
          // link the case table to the new data set
          linkTileToDataSet(newTile.content, sharedData.dataSet)
        }
      }
      // Add dataset to the formula manager
      getFormulaManager(self)?.addDataSet(data)

      return sharedData
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyUndoableAction)

export type IDocumentContentModel = Instance<typeof DocumentContentModel>
export type IDocumentContentSnapshotIn = SnapshotIn<typeof DocumentContentModel>
