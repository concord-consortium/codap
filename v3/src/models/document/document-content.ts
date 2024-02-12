import { Instance, SnapshotIn } from "mobx-state-tree"
import { BaseDocumentContentModel } from "./base-document-content"
import { isFreeTileRow } from "./free-tile-row"
import { kTitleBarHeight } from "../../components/constants"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { getTileComponentInfo } from "../tiles/tile-component-info"
import { getFormulaManager, getTileEnvironment } from "../tiles/tile-environment"
import { getTileContentInfo } from "../tiles/tile-content-info"
import { ITileModel, TileModel } from "../tiles/tile-model"
import { typedId } from "../../utilities/js-utils"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { DataSet, IDataSet, toCanonical } from "../data/data-set"
import { gDataBroker } from "../data/data-broker"
import { applyUndoableAction } from "../history/apply-undoable-action"
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

export const DocumentContentModel = BaseDocumentContentModel
  .named("DocumentContent")
  .actions(self => ({
    prepareSnapshot() {
      // prepare each row for serialization
      self.rowMap.forEach(row => row.prepareSnapshot())

      // prepare each data set for serialization
      const sharedDataSets = getSharedDataSets(self)
      sharedDataSets.forEach(model => model.dataSet.prepareSnapshot())
    },
    completeSnapshot() {
      // complete serialization for each data set
      const sharedDataSets = getSharedDataSets(self)
      sharedDataSets.forEach(model => model.dataSet.completeSnapshot())

      // complete serialization for each row
      self.rowMap.forEach(row => row.completeSnapshot())
    },
    createDefaultTileOfType(tileType: string) {
      const env = getTileEnvironment(self)
      const info = getTileContentInfo(tileType)
      const id = typedId(info?.prefix || "TILE")
      const content = info?.defaultContent({ env })
      return content ? TileModel.create({ id, content }) : undefined
    }
  }))
  .actions(self => ({
    createTile(tileType: string): ITileModel | undefined {
      const componentInfo = getTileComponentInfo(tileType)
      if (!componentInfo) return
      const width = componentInfo.defaultWidth
      const height = componentInfo.defaultHeight
      const row = self.getRowByIndex(0)
      if (row) {
        const newTile = self.createDefaultTileOfType(tileType)
        if (newTile) {
          if (isFreeTileRow(row)) {
            const newTileSize = {width, height}
            const {x, y} = getPositionOfNewComponent(newTileSize)
            const tileOptions = { x, y, width, height }
            self.insertTileInRow(newTile, row, tileOptions)
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
  }))
  .actions(self => ({
    toggleTileVisibility(tileType: string) {
      const tiles = self?.getTilesOfType(tileType)
      if (tiles && tiles.length > 0) {
        const tileId = tiles[0].id
        self?.deleteTile(tileId)
      } else {
        return self.createTile(tileType)
      }
    }
  }))
  .actions(self => ({
    createOrShowTile(tileType: string) {
      const tileInfo = getTileContentInfo(tileType)
      if (tileInfo) {
        if (tileInfo.isSingleton) {
          self.toggleTileVisibility(tileType)
        } else {
          return self.createTile(tileType)
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
