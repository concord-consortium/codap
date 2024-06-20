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
import { ITileModel } from "../tiles/tile-model"
import { ComponentRect } from "../../utilities/animation-utils"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { t } from "../../utilities/translation/translate"
import { createTileSnapshotOfType, INewTileOptions } from "../codap/create-tile"
import { DataSet, IDataSet, IDataSetSnapshot, toCanonical } from "../data/data-set"
import { gDataBroker } from "../data/data-broker"
import { applyModelChange } from "../history/apply-model-change"
import { SharedCaseMetadata } from "../shared/shared-case-metadata"
import { ISharedDataSet, SharedDataSet, kSharedDataSetType } from "../shared/shared-data-set"
import { getSharedDataSets, linkTileToDataSet } from "../shared/shared-data-utils"

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

export const DocumentContentModel = BaseDocumentContentModel
  .named("DocumentContent")
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)
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
      let name = baseDataSetName
      const existingNames = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
                              .map((sharedModel: ISharedDataSet) => sharedModel.dataSet.name) ?? []
      for (let i = 2; existingNames.includes(name); ++i) {
        name = `${baseDataSetName} ${i}`
      }
      const dataSet: IDataSetSnapshot = { ...snapshot, name }
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
      const width = options?.width ?? (componentInfo.defaultWidth || 0)
      const height = options?.height ?? (componentInfo.defaultHeight || 0)
      const row = self.getRowByIndex(0)
      if (row) {
        const env = getTileEnvironment(self)
        const newTileSnapshot = createTileSnapshotOfType(tileType, env, options)
        if (newTileSnapshot) {
          if (isFreeTileRow(row)) {
            const newTileSize = {width, height}
            const computedPosition = getPositionOfNewComponent(newTileSize)
            const x = options?.x ?? computedPosition.x
            const y = options?.y ?? computedPosition.y
            const from: ComponentRect = { x: 0, y: 0, width: 0, height: kTitleBarHeight },
              to: ComponentRect = { x, y, width, height: height + kTitleBarHeight}
            const newTile = self.insertTileSnapshotInRow(newTileSnapshot, row, from)
            if (newTile) {
              const rowTile = row.tiles.get(newTile.id)
              if (width && height && rowTile) {
                // use setTimeout to push the change into a subsequent action
                setTimeout(() => {
                  // use applyModelChange to wrap into a single non-undoable action without undo string
                  self.applyModelChange(() => {
                    rowTile.setPosition(to.x, to.y)
                    rowTile.setSize(to.width, to.height)
                  })
                })
              }
              return newTile
            }
          }
        }
      }
    }
  }))
  .views(self => ({
    isTileHidden(tileId?: string) {
      if (tileId) {
        const tileLayout = self.getTileLayoutById(tileId)
        if (isFreeTileLayout(tileLayout)) {
          return !!tileLayout.isHidden
        }
      }
      return false
    }
  }))
  .actions(self => ({
    toggleSingletonTileVisibility(tileType: string, options?: INewTileOptions) {
      const tiles = self?.getTilesOfType(tileType)
      if (tiles.length > 1) {
        console.error("DocumentContent.toggleSingletonTileVisibility:",
                      `encountered ${tiles.length} tiles of type ${tileType}`)
      }
      if (tiles && tiles.length > 0) {
        const tile = tiles[0]
        const tileLayout = self.getTileLayoutById(tile.id)
        if (isFreeTileLayout(tileLayout)) {
          tileLayout.setHidden(options?.setSingletonHidden ?? !tileLayout.isHidden)
        }
        return tile
      } else {
        return self.createTile(tileType, options)
      }
    },
    toggleNonDestroyableTileVisibility(tileLayoutId: string | undefined) {
      if (tileLayoutId) {
        const tileLayout = self.getTileLayoutById(tileLayoutId)
        if (isFreeTileLayout(tileLayout)) {
          tileLayout.setHidden(!tileLayout.isHidden)
        }
      }
    }
  }))
  .actions(self => ({
    createOrShowTile(tileType: string, options?: INewTileOptions) {
      const tileInfo = getTileContentInfo(tileType)
      if (tileInfo) {
        if (tileInfo.isSingleton) {
          return self.toggleSingletonTileVisibility(tileType, options)
        } else {
          return self.createTile(tileType, options)
        }
      }
    },
    // Hide the tile if it should hide on close or is a singleton and can be hidden. Otherwise, delete it.
    deleteOrHideTile(tileId: string) {
      const tile = self.getTile(tileId)
      const tileInfo = getTileContentInfo(tile?.content.type)
      if (tileInfo?.hideOnClose || tileInfo?.isSingleton) {
        const tileLayout = self.getTileLayoutById(tileId)
        if (isFreeTileLayout(tileLayout)) {
          tileLayout.setHidden(true)
          return
        }
      }
      self.deleteTile(tileId)
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
          linkTileToDataSet(newTile, sharedData.dataSet)
        }
      }
      // Add dataset to the formula manager
      getFormulaManager(self)?.addDataSet(data)

      return sharedData
    }
  }))

export type IDocumentContentModel = Instance<typeof DocumentContentModel>
export type IDocumentContentSnapshotIn = SnapshotIn<typeof DocumentContentModel>
