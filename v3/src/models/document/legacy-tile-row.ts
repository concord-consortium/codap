import { types, Instance, SnapshotIn, SnapshotOut } from "mobx-state-tree"
import { withoutUndo } from "../history/without-undo"
import { ITileModel } from "../tiles/tile-model"
import { ITileInRowOptions, TileRowModel } from "./tile-row"

export interface IDropRowInfo {
  rowInsertIndex: number
  rowDropIndex?: number
  rowDropLocation?: string
  updateTimestamp?: number
}

export const LegacyTileLayoutModel = types
  .model("TileLayout", {
    tileId: types.string,
    widthPct: types.maybe(types.number)
  })
  .volatile(self => ({
    isUserResizable: false,
    isUserClosable: false
  }))
  .actions(self => ({
    setWidthPct(widthPct?: number) {
      self.widthPct = widthPct
    },
    setUserResizable(isUserResizable: boolean) {
      self.isUserResizable = isUserResizable
    },
    setUserClosable(isUserClosable: boolean) {
      self.isUserClosable = isUserClosable
    }
  }))
export interface ILegacyTileLayoutModel extends Instance<typeof LegacyTileLayoutModel> {}

export interface ILegacyTileInRowOptions extends ITileInRowOptions {
  index: number
  isUserResizable?: boolean
  isUserClosable?: boolean
}
export const isLegacyTileInRowOptions = (options?: ITileInRowOptions): options is ILegacyTileInRowOptions =>
              (options as any)?.index != null

export const LegacyTileRowModel = TileRowModel
  .named("LegacyTileRow")
  .props({
    type: types.optional(types.literal("legacy"), "legacy"),
    tiles: types.array(LegacyTileLayoutModel)
  })
  .views(self => ({
    get removeWhenEmpty() {
      return true
    },
    get isEmpty() {
      return (self.tiles.length === 0) && !self.isSectionHeader
    },
    get tileCount() {
      return self.tiles.length
    },
    get isUserResizable() {
      return !self.isSectionHeader && self.tiles.some(tileRef => tileRef.isUserResizable)
    },
    get isUserClosable() {
      return !self.isSectionHeader && self.tiles.some(tileRef => tileRef.isUserClosable)
    },
    get tileIds() {
      return self.tiles.map(tile => tile.tileId)
    },
    getNode(tileId: string) {
      return self.tiles.find(tile => tile.tileId === tileId)
    },
    acceptTileDrop(rowInfo: IDropRowInfo) {
      const rowDropLocation = rowInfo.rowDropLocation
      return !self.isSectionHeader && ((rowDropLocation === "left") || (rowDropLocation === "right"))
    },
    getTileIdAtIndex(index: number) {
      const layout = (index >= 0) && (index < self.tiles.length) ? self.tiles[index] : undefined
      return layout?.tileId
    },
    getTileLayout(tileId: string): ILegacyTileLayoutModel | undefined {
      return self.tiles.find(tile => tile.tileId === tileId)
    },
    hasTile(tileId: string) {
      return self.tiles.findIndex(tileRef => tileRef.tileId === tileId) >= 0
    },
    indexOfTile(tileId: string) {
      return self.tiles.findIndex(tileRef => tileRef.tileId === tileId)
    },
    getContentHeight(getTileHeight?: (tileId: string) => number | undefined) {
      let rowHeight: number | undefined
      self.tiles.forEach(tileInfo => {
        const tileHeight = getTileHeight?.(tileInfo.tileId)
        tileHeight && (rowHeight = Math.max(tileHeight, rowHeight || 0))
      })
      return rowHeight
    }
  }))
  .actions(self => ({
    updateLayout(tileMap: any) {
      self.tiles.forEach(tileRef => {
        const tile: ITileModel = tileMap.get(tileRef.tileId)
        if (tile) {
          tileRef.setUserResizable(tile.isUserResizable)
          tileRef.setUserClosable(tile.isUserClosable)
        }
      })
    },
    insertTile(tileId: string, options?: ITileInRowOptions) {
      const { tileIndex, isUserResizable = true, isUserClosable = true } = isLegacyTileInRowOptions(options)
        ? options
        : {} as any
      const dstTileIndex = (tileIndex != null) && (tileIndex >= 0) && (tileIndex < self.tiles.length)
                            ? tileIndex
                            : self.tiles.length
      const tileRef = LegacyTileLayoutModel.create({ tileId })
      tileRef.setUserResizable(isUserResizable)
      tileRef.setUserResizable(isUserClosable)

      self.tiles.splice(dstTileIndex, 0, tileRef)
    },
    moveTileInRow(tileId: string, fromTileIndex: number, toTileIndex: number) {
      const dstTileIndex = fromTileIndex < toTileIndex ? toTileIndex - 1 : toTileIndex
      const tileIds = self.tiles.map(tileRef => tileRef.tileId)
      tileIds.splice(fromTileIndex, 1)
      tileIds.splice(dstTileIndex, 0, tileId)
      const tileIndexMap: { [id: string]: number } = {}
      tileIds.forEach((id, index) => { tileIndexMap[id] = index })
      const compareFunc = (tileRef1: ILegacyTileLayoutModel, tileRef2: ILegacyTileLayoutModel) =>
                            tileIndexMap[tileRef1.tileId] - tileIndexMap[tileRef2.tileId]
      const sortedTiles = self.tiles.slice().sort(compareFunc)
      self.tiles.replace(sortedTiles)
    },
    removeTile(tileId: string) {
      self.tiles.replace(self.tiles.filter(tile => tile.tileId !== tileId))
      if (!self.isUserResizable) {
        self.height = undefined
      }
    },
    removeTilesFromRow(removeFn: (tileId: string) => boolean) {
      self.tiles.replace(self.tiles.filter(tile => !removeFn(tile.tileId)))
      if (!self.isUserResizable) {
        self.height = undefined
      }
    }
  }))
  .actions(self => ({
    setRowHeightWithoutUndo(height?: number) {
      withoutUndo()
      self.setRowHeight(height)
    }
  }))

export interface ILegacyTileRowModel extends Instance<typeof LegacyTileRowModel> {}
export interface ILegacyTileRowSnapshotIn extends SnapshotIn<typeof LegacyTileRowModel> {}
export interface ILegacyTileRowSnapshotOut extends SnapshotOut<typeof LegacyTileRowModel> {}
