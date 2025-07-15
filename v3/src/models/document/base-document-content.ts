import {
  applySnapshot, clone, getEnv, getSnapshot, getType, hasEnv, Instance, SnapshotIn, types
} from "mobx-state-tree"
import { ISharedModel, SharedModel } from "../shared/shared-model"
import { isPlaceholderTile } from "../tiles/placeholder/placeholder-content"
import { ITileModel, ITileModelSnapshotIn, TileModel } from "../tiles/tile-model"
import { ITileInRowOptions } from "./tile-row"
import { ITileLayoutUnion, ITileRowModelUnion, TileRowModelUnion } from "./tile-row-union"
import { SharedModelEntry, SharedModelMap } from "./shared-model-entry"
import { toV2Id } from "../../utilities/codap-utils"

export const BaseDocumentContentModel = types
  .model("BaseDocumentContent", {
    // v2/v3 CODAP documents will only have a single "row"
    rowMap: types.map(TileRowModelUnion),
    rowOrder: types.array(types.string),
    tileMap: types.map(TileModel),
    // The keys to this map should be the id of the shared model
    sharedModelMap: SharedModelMap
  })
  .volatile(self => ({
    rowCreator: undefined as (() => ITileRowModelUnion) | undefined,
    visibleRows: [] as string[]
  }))
  .views(self => ({
    get isEmpty() {
      return self.tileMap.size === 0
    },
    getTile(tileId: string) {
      return self.tileMap.get(tileId) ??
        Array.from(self.tileMap.values()).find(tile => +tileId === toV2Id(tile.id))
    },
    getTilesOfType(type: string) {
      const tileMapEntries = Array.from(self.tileMap.values())
      return tileMapEntries.filter(tile => tile.content.type === type)
    },
    get rowCount() {
      return self.rowOrder.length
    },
    get firstRow(): ITileRowModelUnion | undefined {
      return this.getRowByIndex(0)
    },
    getRow(rowId: string): ITileRowModelUnion | undefined {
      return self.rowMap.get(rowId)
    },
    getRowByIndex(index: number): ITileRowModelUnion | undefined {
      return index < self.rowOrder.length ? self.rowMap.get(self.rowOrder[index]) : undefined
    },
    getRowIndex(rowId: string) {
      return self.rowOrder.findIndex(_rowId => _rowId === rowId)
    },
    findRowIdContainingTile(tileId: string) {
      return self.rowOrder.find(rowId => self.rowMap.get(rowId)?.hasTile(tileId))
    },
    numTilesInRow(rowId: string) {
      const row = self.rowMap.get(rowId)
      return row?.tileCount ?? 0
    },
    isPlaceholderRow(row: ITileRowModelUnion) {
      // Note that more than one placeholder tile in a row shouldn't happen
      // in theory, but it has been known to happen as a result of bugs.
      return row.tileIds.every(tileId => {
        const tile = tileId ? self.tileMap.get(tileId) : undefined
        return isPlaceholderTile(tile)
      })
    },
    get indexOfLastVisibleRow() {
      // returns last visible row or last row
      if (!self.rowOrder.length) return -1
      const lastVisibleRowId = self.visibleRows.length
                                ? self.visibleRows[self.visibleRows.length - 1]
                                : self.rowOrder[self.rowOrder.length - 1]
      return self.rowOrder.indexOf(lastVisibleRowId)
    },
    getFirstSharedModelByType<IT extends typeof SharedModel>(
      modelType: IT, tileId?: string): IT["Type"] | undefined {
      const sharedModelEntries = Array.from(self.sharedModelMap.values())
      // Even if we use a snapshotProcessor generated type, getType will return the original type
      const firstEntry = sharedModelEntries.find(entry =>
        (getType(entry.sharedModel) === modelType) &&
        (!tileId || !!entry.tiles.find(tile => tileId === tile.id)))
      return firstEntry?.sharedModel
    },
    getSharedModelsByType<IT extends typeof SharedModel>(type: string): IT["Type"][] {
      const sharedModelEntries = Array.from(self.sharedModelMap.values())
      return sharedModelEntries.map(entry => entry.sharedModel).filter(model => model.type === type)
    },
    getTileLayoutById(tileId: string): ITileLayoutUnion | undefined {
      let result: ITileLayoutUnion | undefined
      self.rowMap.forEach(row => {
        if (!result) result = row.getTileLayout(tileId) as ITileLayoutUnion
      })
      return result
    }
  }))
  .views(self => ({
    // Returns a row instance if the new tile should be inserted in an existing row or an
    // index if a new row should be created (at the returned index) to contain the new tile.
    get defaultInsertRow() {
      // next tile comes after the last visible row with content
      for (let i = self.indexOfLastVisibleRow; i >= 0; --i) {
        const row = self.getRowByIndex(i)
        if (row?.acceptDefaultInsert) return row
        if (row && !row.isSectionHeader && !self.isPlaceholderRow(row)) {
          return i + 1
        }
      }
      // if no tiles have content, insert after the first non-header row
      for (let i = 0; i < self.rowCount; ++i) {
        const row = self.getRowByIndex(i)
        if (row?.acceptDefaultInsert) return row
        if (row && !row.isSectionHeader) {
          return i + 1
        }
      }
      // if all else fails, revert to last visible row
      return self.indexOfLastVisibleRow + 1
    },
    findRowContainingTile(tileId: string) {
      const rowId = self.findRowIdContainingTile(tileId)
      if (rowId) {
        return self.rowMap.get(rowId)
      }
    }
  }))
  .views(self => ({
    getTileDimensions(tileId: string) {
      return self.findRowContainingTile(tileId)?.getTileDimensions(tileId)
    }
  }))
  .actions(self => ({
    setRowCreator(creator: () => ITileRowModelUnion) {
      self.rowCreator = creator
    },
    insertRow(row: ITileRowModelUnion, rowIndex?: number) {
      self.rowMap.put(row)
      if ((rowIndex != null) && (rowIndex < self.rowOrder.length)) {
        self.rowOrder.splice(rowIndex, 0, row.id)
      }
      else {
        self.rowOrder.push(row.id)
      }
    },
    insertTileInRow(tile: ITileModel, row: ITileRowModelUnion, options?: ITileInRowOptions) {
      row.insertTile(tile.id, options)
      self.tileMap.put(tile)
    },
    insertTileSnapshotInRow(
      tileSnap: ITileModelSnapshotIn, row: ITileRowModelUnion, options?: ITileInRowOptions
    ): ITileModel | undefined {
      const tile = self.tileMap.put(tileSnap)
      row.insertTile(tile.id, options)
      return tile
    },
    setVisibleRows(rows: string[]) {
      self.visibleRows = rows
    },
    setTileDimensions(tileId: string, dimensions: { width?: number, height?: number }) {
      self.findRowContainingTile(tileId)?.setTileDimensions(tileId, dimensions)
    },
    /**
     * This should not be called by users. It is used internally and by the
     * SharedModelDocumentManager
     *
     * This index is used for assigning colors to datasets. It is not a computed
     * property because we want it to be stable. When a shared model is removed,
     * the other shared model indexes should not change.
     *
     * @param sharedModel
     */
    _assignSharedModelIndexOfType(sharedModel: ISharedModel) {
      if (sharedModel.indexOfType < 0) {
        const usedIndices = new Set<number>()
        const sharedModels = self.getSharedModelsByType(sharedModel.type)
        sharedModels?.forEach(model => {
          if (model.indexOfType >= 0) {
            usedIndices.add(model.indexOfType)
          }
        })
        for (let i = 0; sharedModel.indexOfType < 0; ++i) {
          if (!usedIndices.has(i)) {
            sharedModel.setIndexOfType(i)
            break
          }
        }
      }
    }
  }))
  .actions(self => ({
    insertTileInDefaultRow(tile: ITileModel) {
      const rowOrIndex = self.defaultInsertRow
      const requiresNewRow = typeof rowOrIndex === "number"
      const row = requiresNewRow ? self.rowCreator?.() : rowOrIndex
      if (row != null) {
        if (requiresNewRow) {
          self.insertRow(row, rowOrIndex)
        }
        self.insertTileInRow(tile, row)
      }
    },
    insertTileSnapshotInDefaultRow(tileSnap: ITileModelSnapshotIn, options?: ITileInRowOptions): Maybe<ITileModel> {
      const rowOrIndex = self.defaultInsertRow
      const requiresNewRow = typeof rowOrIndex === "number"
      const row = requiresNewRow ? self.rowCreator?.() : rowOrIndex
      if (row != null) {
        if (requiresNewRow) {
          self.insertRow(row, rowOrIndex)
        }
        const tile = self.insertTileSnapshotInRow(tileSnap, row, options)
        return tile
      }
    },
    deleteRow(rowId: string) {
      self.rowOrder.remove(rowId)
      self.rowMap.delete(rowId)
      self.setVisibleRows(self.visibleRows.filter(id => id !== rowId))
    },
  }))
  .actions(self => ({
    deleteTile(tileId: string) {
      const rowId = self.findRowIdContainingTile(tileId)
      const row = rowId ? self.rowMap.get(rowId) : undefined
      row?.removeTile(tileId)
      if (row?.isEmpty && row.removeWhenEmpty) {
        self.deleteRow(row.id)
      }
      self.tileMap.delete(tileId)
    },
    deleteTilesFromRow(row: ITileRowModelUnion) {
      row.tileIds
        .forEach(tileId => {
          row.removeTile(tileId)
          self.tileMap.delete(tileId)
        })
      if (row?.isEmpty && row.removeWhenEmpty) {
        self.deleteRow(row.id)
      }
    }
  }))
  .actions(self => ({
    addSharedModel(sharedModel: ISharedModel) {
      // we make sure there isn't an entry already otherwise adding a shared
      // model twice would clobber the existing entry.
      let sharedModelEntry = self.sharedModelMap.get(sharedModel.id)

      if (!sharedModelEntry) {
        self._assignSharedModelIndexOfType(sharedModel)

        // shared models with provisional environments must be cloned to avoid incompatible environment error
        const shouldClone = hasEnv(sharedModel) && getEnv(sharedModel) !== getEnv(self)
        const sharedModelToAdd = shouldClone ? clone(sharedModel, false) : sharedModel
        sharedModelEntry = SharedModelEntry.create({ sharedModel: sharedModelToAdd })
        self.sharedModelMap.set(sharedModel.id, sharedModelEntry)
        if (shouldClone) {
          // apply the snapshot after it's been added to the tree so references resolve
          applySnapshot(sharedModelToAdd, getSnapshot(sharedModel))
        }
      }

      return sharedModelEntry
    },
    removeSharedModelsAndTiles(sharedModels: ISharedModel[], tiles?: ITileModel[]) {
      sharedModels.forEach(sharedModel => {
        self.sharedModelMap.delete(sharedModel.id)
      })
      if (tiles) {
        tiles.forEach(tile => {
          self.deleteTile(tile.id)
        })
      }
    }
  }))
  .actions(self => ({
    /**
     * This should not be called directly, but rather through
     * `sharedModelManager.addTileSharedModel`
     */
    _addTileSharedModel(tile: ITileModel, sharedModel: ISharedModel, isProvider = false): void {
      // register it with the document if necessary.
      // This won't re-add it if it is already there
      const sharedModelEntry = self.addSharedModel(sharedModel)

      // If the sharedModel was added before and it is already linked to this tile,
      // we don't need to do anything
      if (sharedModelEntry.tiles.includes(tile)) {
        return
      }

      // The TreeMonitor will identify this change as a shared model change and call
      // updateAfterSharedModelChanges on the tile content model.
      sharedModelEntry.addTile(tile, isProvider)
    }
  }))
export interface IBaseDocumentContentModel extends Instance<typeof BaseDocumentContentModel> {}
export interface IBaseDocumentContentSnapshotIn extends SnapshotIn<typeof BaseDocumentContentModel> {}
