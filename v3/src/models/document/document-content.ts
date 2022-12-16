import { getType, Instance, types } from "mobx-state-tree"
import { SharedModel } from "../shared/shared-model"
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
    visibleRows: [] as string[]
  }))
  .views(self => ({
    get isEmpty() {
      return self.tileMap.size === 0
    },
    getTile(tileId: string) {
      return tileId ? self.tileMap.get(tileId) : undefined
    },
    get rowCount() {
      return self.rowOrder.length
    },
    getRow(rowId: string): ITileRowModelUnion | undefined {
      return self.rowMap.get(rowId)
    },
    getRowByIndex(index: number): ITileRowModelUnion | undefined {
      return self.rowMap.get(self.rowOrder[index])
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
    get defaultInsertRow() {
      // next tile comes after the last visible row with content
      for (let i = self.indexOfLastVisibleRow; i >= 0; --i) {
        const row = self.getRowByIndex(i)
        if (row?.acceptDefaultInsert) return i
        if (row && !row.isSectionHeader && !self.isPlaceholderRow(row)) {
          return i + 1
        }
      }
      // if no tiles have content, insert after the first non-header row
      for (let i = 0; i < self.rowCount; ++i) {
        const row = self.getRowByIndex(i)
        if (row?.acceptDefaultInsert) return i
        if (row && !row.isSectionHeader) {
          return i
        }
      }
      // if all else fails, revert to last visible row
      return self.indexOfLastVisibleRow + 1
    },
  }))
  .actions(self => ({
    insertRow(row: ITileRowModelUnion, index?: number) {
      self.rowMap.put(row)
      if ((index != null) && (index < self.rowOrder.length)) {
        self.rowOrder.splice(index, 0, row.id)
      }
      else {
        self.rowOrder.push(row.id)
      }
    },
    deleteRow(rowId: string) {
      self.rowOrder.remove(rowId)
      self.rowMap.delete(rowId)
    },
    insertNewTileInRow(tile: ITileModel, row: ITileRowModelUnion, options?: ITileInRowOptions) {
      row.insertTile(tile.id, options)
      self.tileMap.put(tile)
    },
    deleteTile(tileId: string) {
      const rowId = self.findRowIdContainingTile(tileId)
      const row = rowId ? self.rowMap.get(rowId) : undefined
      row?.removeTile(tileId)
      if (row?.isEmpty && row.removeWhenEmpty) {
        self.rowMap.delete(row.id)
      }
      self.tileMap.delete(tileId)
    },
    deleteTilesFromRow(row: ITileRowModelUnion) {
      row.tileIds
        .forEach(tileId => {
          row.removeTile(tileId)
          self.tileMap.delete(tileId)
        })
    },
    setVisibleRows(rows: string[]) {
      self.visibleRows = rows
    }
  }))
