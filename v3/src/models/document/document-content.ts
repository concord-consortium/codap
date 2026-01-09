import { Instance, SnapshotIn } from "mobx-state-tree"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { t } from "../../utilities/translation/translate"
import { getGuideIndex, urlParams } from "../../utilities/url-params"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { createTileSnapshotOfType, INewTileOptions } from "../codap/create-tile"
import { DataSet, IDataSet, IDataSetSnapshot } from "../data/data-set"
import { gDataBroker } from "../data/data-broker"
import { applyModelChange } from "../history/apply-model-change"
import { DataSetMetadata } from "../shared/data-set-metadata"
import { ISharedDataSet, SharedDataSet, kSharedDataSetType } from "../shared/shared-data-set"
import { getSharedDataSets } from "../shared/shared-data-utils"
import { getTileComponentInfo } from "../tiles/tile-component-info"
import { TileBroadcastCallback, TileBroadcastMessage } from "../tiles/tile-content"
import { getTileContentInfo } from "../tiles/tile-content-info"
import { getFormulaManager, getSharedModelManager, getTileEnvironment } from "../tiles/tile-environment"
import { ITileModel } from "../tiles/tile-model"
import { BaseDocumentContentModel } from "./base-document-content"
import { linkTileToDataSet } from "./data-set-linking"
import { isFreeTileLayout, isFreeTileRow } from "./free-tile-row"

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
  width?: number              // default width
}

export const DocumentContentModel = BaseDocumentContentModel
  .named("DocumentContent")
  .volatile(() => ({
    _gaussianFitEnabled: false
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)
  .actions(self => ({
    afterCreate() {
      // if the `guideIndex` url param is present, make sure any guide tiles are visible
      const guideIndex = getGuideIndex()
      const container = isFreeTileRow(self.firstRow) ? self.firstRow : undefined
      if (guideIndex != null && container) {
        self.getTilesOfType(kWebViewTileType).forEach(tile => {
          const tileLayout = container.getNode(tile.id)
          const webViewContent = isWebViewModel(tile.content) ? tile.content : undefined
          if (webViewContent?.subType === "guide" && tileLayout?.isHidden) {
            tileLayout.setHidden(false)
          }
        })
      }
    },
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
    afterApplySnapshot() {
      // update volatile state for each data
      const sharedDataSets = getSharedDataSets(self)
      sharedDataSets.forEach(model => model.dataSet.afterApplySnapshot())

      // update volatile state for each tile
      self.tileMap.forEach(tile => tile.afterApplySnapshot())

      // Changes to just dataset values do not trigger formula recalculation,
      // To be safe we recalculate all formulas after applying the snapshot
      // In many cases the formulas will be recalculated anyhow because the
      // number of cases have changed or some other state being observed by the formula
      // changed. We could be smarter and make sure the formulas are not recalculated
      // more than once.
      // Also note that the id of the formulas change during the round trip to v2 and
      // back. That means the formulas will be recalculate every time a snapshot is
      // applied. However, this automatic recalculation happens before the strValues
      // of the attributes have been initialized to the correct length, so the automatic
      // recalculation doesn't actually update the values correctly.
      getFormulaManager(self)?.recalculateActiveFormulas()

      // TODO: do we need to do anything for rows?
      // It doesn't seem like rows actually do anything with prepareSnapshot
    },
    broadcastMessage(message: TileBroadcastMessage, callback: TileBroadcastCallback, targetTileId?: string) {
      const tileIds = self.tileMap.keys()
      if (tileIds) {
        Array.from(tileIds).forEach(tileId => {
          if (!targetTileId || tileId === targetTileId) {
            self.tileMap.get(tileId)?.content.broadcastMessage(message, callback)
          }
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

      const sharedMetadata = DataSetMetadata.create()
      sharedModelManager?.addSharedModel(sharedMetadata)
      sharedMetadata.setData(sharedDataSet.dataSet)

      return { sharedDataSet, sharedMetadata }
    },
    createTile(tileType: string, options?: INewTileOptions): ITileModel | undefined {
      const componentInfo = getTileComponentInfo(tileType)
      if (!componentInfo) return
      const animateCreation = options?.animateCreation ?? false
      const width = options?.width ?? (componentInfo.defaultWidth || 0)
      const height = options?.height ?? (componentInfo.defaultHeight || 0)
      const row = self.getRowByIndex(0)
      if (row) {
        const env = getTileEnvironment(self)
        const newTileSnapshot = createTileSnapshotOfType(tileType, env, options)
        if (newTileSnapshot) {
          if (isFreeTileRow(row)) {
            const newTileSize = {width, height}
            const position = typeof options?.position === 'string'
              ? options?.position : undefined
            const computedPosition = getPositionOfNewComponent(newTileSize, position)
            const x = options?.x ?? computedPosition.x
            const y = options?.y ?? computedPosition.y
            const tileOptions = { x, y, width, height, animateCreation }
            return self.insertTileSnapshotInRow(newTileSnapshot, row, tileOptions)
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
    },
    get gaussianFitEnabled() {
      return self._gaussianFitEnabled || urlParams.gaussianFit !== undefined
    },
    get iciEnabled() {
      return urlParams.ICI !== undefined
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

        // Update existing tile with new settings
        if (options?.title != null) {
          tile.setTitle(options.title)
        }

        // Change visibility of existing tile
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
      if (tileInfo) {
        if (tileInfo.isSingleton  || (tileInfo.hideOnClose?.(tile?.content))) {
          const tileLayout = self.getTileLayoutById(tileId)
          if (isFreeTileLayout(tileLayout)) {
            tileLayout.setHidden(true)
            return
          }
        }
      }
      self.deleteTile(tileId)
    }
  }))
  .actions(self => ({
    createStarterDataset() {
      const attributeName = t("DG.AppController.createDataSet.initialAttribute")
      const ds = DataSet.create({ name: t("DG.AppController.createDataSet.name")})
      ds.addAttribute({ name: attributeName })
      gDataBroker.addDataSet(ds)
      // Add dataset to the formula manager
      getFormulaManager(self)?.addDataSet(ds)
    },
    importDataSet(data: IDataSet, options?: IImportDataSetOptions) {
      const { createDefaultTile = true, defaultTileType = kCaseTableTileType, width } = options || {}
      // add data set
      const { sharedData } = gDataBroker.addDataSet(data)
      if (sharedData.dataSet && createDefaultTile) {
        // create the corresponding case table
        const newTile = self.createOrShowTile(defaultTileType, { width })
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
  .actions(self => ({
    // The plugin api can set the gaussianFitEnabled state
    setGaussianFitEnabled(enabled: boolean) {
      self._gaussianFitEnabled = enabled
    }
  }))

export type IDocumentContentModel = Instance<typeof DocumentContentModel>
export type IDocumentContentSnapshotIn = SnapshotIn<typeof DocumentContentModel>
