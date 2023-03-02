import { getType, Instance, SnapshotIn, types } from "mobx-state-tree"
import { ISharedModel, SharedModel } from "../shared/shared-model"
import { SharedModelUnion } from "../shared/shared-model-manager"
import { isPlaceholderTile } from "../tiles/placeholder/placeholder-content"
import { ITileModel, TileModel } from "../tiles/tile-model"
import { ITileInRowOptions } from "./tile-row"
import { ITileRowModelUnion, TileRowModelUnion } from "./tile-row-union"

// This intermediate type is added so we can store which tiles are using the
// shared model. It is also necessary so the SharedModelUnion can be evaluated
// late. If the sharedModelMap was a map directly to SharedModelUnion the late
// evaluation would happen immediately and not pick up the registered shared
// model tiles. This issue with using late and maps is documented here:
// `src/models/mst.test.ts`
export const SharedModelEntry = types.model("SharedModelEntry", {
  sharedModel: SharedModelUnion,
  provider: types.safeReference(TileModel, {acceptsUndefined: true}),
  tiles: types.array(types.safeReference(TileModel, {acceptsUndefined: false}))
})
.actions(self => ({
  addTile(tile: ITileModel, isProvider?: boolean) {
    isProvider && (self.provider = tile)
    self.tiles.push(tile)
  },
  removeTile(tile: ITileModel) {
    (tile.id === self.provider?.id) && (self.provider = undefined)
    self.tiles.remove(tile)
  }
}))
export type SharedModelEntryType = Instance<typeof SharedModelEntry>

export const DocumentContentModel = types
  .model("DocumentContent", {
    // v2/v3 CODAP documents will only have a single "row"
    rowMap: types.map(TileRowModelUnion),
    rowOrder: types.array(types.string),
    tileMap: types.map(TileModel),
    // The keys to this map should be the id of the shared model
    sharedModelMap: types.map(SharedModelEntry)
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
      return tileId && self.tileMap.has(tileId) ? self.tileMap.get(tileId) : undefined
    },
    hasTileOfType(type: string) {
      const tileMapEntries = Array.from(self.tileMap.values())
      return tileMapEntries.filter(tile => tile.content.type === type)
    },
    get rowCount() {
      return self.rowOrder.length
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
      return  self.rowOrder.indexOf(lastVisibleRowId)
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
    setVisibleRows(rows: string[]) {
      self.visibleRows = rows
    }
  }))
  .actions(self => ({
    insertTileInDefaultRow(tile: ITileModel) {
      const rowOrIndex = self.defaultInsertRow
      const requiresNewRow = typeof rowOrIndex === "number"
      const row = requiresNewRow ? self.rowCreator?.() : rowOrIndex
      if (row) {
        if (requiresNewRow) {
          self.insertRow(row, rowOrIndex)
        }
        self.insertTileInRow(tile, row)
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
        sharedModelEntry = SharedModelEntry.create({sharedModel})
        self.sharedModelMap.set(sharedModel.id, sharedModelEntry)
      }

      return sharedModelEntry
    },

  }))
export interface IDocumentContentModel extends Instance<typeof DocumentContentModel> {}
export interface IDocumentContentSnapshotIn extends SnapshotIn<typeof DocumentContentModel> {}
