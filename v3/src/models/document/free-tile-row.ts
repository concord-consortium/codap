import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { ITileInRowOptions, ITileRowModel, TileRowModel } from "./tile-row"
import { withoutUndo } from "../history/without-undo"
import { withUndoRedoStrings } from "../history/codap-undo-types"

/*
  Represents the layout of a set of tiles/components with arbitrary rectangular bounds that can
  overlap each other and allows placement by the user. The term "row" is derived from the legacy
  CLUE implementation of tiles arranged horizontally in a row, but can be interpreted to mean a
  separate space within which tiles/components can be laid out. For instance, in the future CODAP
  could support multi-page/tabbed documents where each page/tab would have its own layout. In the
  v2/v3 time frame, however, a CODAP document is represented by a single such "row".
 */


export const FreeTileLayout = types.model("FreeTileLayout", {
  // not types.identifier because it's not unique within the document tree
  tileId: types.string,
  x: types.number,
  y: types.number,
  width: types.maybe(types.number),
  height: types.maybe(types.number),
  isMinimized: types.maybe(types.boolean)
})
.views(self => ({
  get position() {
    return { x: self.x, y: self.y }
  },
  get size() {
    return { width: self.width, height: self.height }
  }
}))
.actions(self => ({
  setPosition(x: number, y: number) {
    self.x = x
    self.y = y
    withUndoRedoStrings("DG.Undo.componentMove", "DG.Redo.componentMove")
  },
  setSize(width?: number, height?: number) {
    self.width = width
    self.height = height
    withUndoRedoStrings("DG.Undo.componentResize", "DG.Redo.componentResize")
  },
  setMinimized(isMinimized: boolean) {
    // only store it if it's true
    self.isMinimized = isMinimized || undefined
  }
}))
export interface IFreeTileLayout extends Instance<typeof FreeTileLayout> {}
export interface IFreeTileLayoutSnapshot extends SnapshotIn<typeof FreeTileLayout> {}

export interface IFreeTileInRowOptions extends ITileInRowOptions {
  x: number
  y: number
  width?: number
  height?: number
}
export const isFreeTileInRowOptions = (options?: ITileInRowOptions): options is IFreeTileInRowOptions =>
              (options as any)?.x != null && (options as any)?.y != null

/*
  Tiles are represented as a map of layouts and an array of tile ids representing the order.
 */

export const FreeTileRow = TileRowModel
  .named("FreeTileRow")
  .props({
    type: types.optional(types.literal("free"), "free"),
    tiles: types.map(FreeTileLayout), // tile id => layout
    order: types.array(types.string)  // tile ids ordered from back to front
  })
  .views(self => ({
    get acceptDefaultInsert() {
      return true
    },
    get removeWhenEmpty() {
      return false
    },
    getNode(tileId: string) {
      return self.tiles.get(tileId)
    },
  }))
  .views(self => ({
    // id of last (top) node in list
    get last() {
      return self.order.length > 0 ? self.order[self.order.length - 1] : ""
    },
    // returns tile ids in list/traversal order
    get tileIds() {
      return self.order
    },
    get tileCount() {
      return self.tiles.size
    },
    hasTile(tileId: string) {
      return self.tiles.has(tileId)
    }
  }))
  .actions(self => ({
    insertTile(tileId: string, options?: ITileInRowOptions) {
      const { x = 50, y = 50, width = undefined, height = undefined } = isFreeTileInRowOptions(options) ? options : {}
      self.tiles.set(tileId, { tileId, x, y, width, height })
      self.order.push(tileId)
    },
    removeTile(tileId: string) {
      const index = self.order.findIndex(id => id === tileId)
      if (index >= 0) {
        self.order.splice(index, 1)
      }
      self.tiles.delete(tileId)
    },
    moveTileToTop(tileId: string) {
      withoutUndo({ suppressWarning: true })
      const index = self.order.findIndex(id => id === tileId)
      if ((index >= 0) && (index < self.order.length - 1)) {
        self.order.splice(index, 1)
        self.order.push(tileId)
      }
    }
  }))
export interface IFreeTileRow extends Instance<typeof FreeTileRow> {}

export function isFreeTileRow(row?: ITileRowModel): row is IFreeTileRow {
  return row?.type === "free"
}
