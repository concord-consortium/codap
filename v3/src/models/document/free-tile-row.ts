import { observable } from "mobx"
import { Instance, SnapshotIn, addDisposer, onPatch, types } from "mobx-state-tree"
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
  isMinimized: types.maybe(types.boolean),
  isHidden: types.maybe(types.boolean)
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
  },
  setHidden(isHidden: boolean) {
    // only store it if it's true
    self.isHidden = isHidden || undefined
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
              !!options && ("x" in options && options.x != null) && ("y" in options && options.y != null)

/*
  Tiles are represented as a map of layouts and an array of tile ids representing the order.
 */

export const FreeTileRow = TileRowModel
  .named("FreeTileRow")
  .props({
    type: types.optional(types.literal("free"), "free"),
    tiles: types.map(FreeTileLayout), // tile id => layout
    savedOrder: types.array(types.string)  // tile ids ordered from back to front
  })
  .preProcessSnapshot((snap: any) => {
    const { order, ...others } = snap
    return order ? { savedOrder: order, ...others } : snap
  })
  .volatile(self => ({
    order: observable.array<string>()
  }))
  .views(self => ({
    get acceptDefaultInsert() {
      return true
    },
    get removeWhenEmpty() {
      return false
    },
    getNode(tileId: string) {
      return self.tiles.get(tileId)
    }
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
    },
    getTileDimensions(tileId: string) {
      const freeTileLayout = self.getNode(tileId)
      return { width: freeTileLayout?.width, height: freeTileLayout?.height }
    }
  }))
  .actions(self => ({
    afterCreate() {
      // initialize volatile order from savedOrder on creation
      self.order.replace([...self.savedOrder])

      addDisposer(self, onPatch(self, ({ op, path }) => {
        // update order whenever tiles are added/removed
        if (op === "add" || op === "remove") {
          const match = /^\/tiles\/(.+)$/.exec(path)
          const tileId = match?.[1]
          if (tileId) {
            // newly added tiles should be front-most
            if (op === "add") {
              self.order.push(tileId)
            }
            // removed tiles should be removed from order
            else {
              self.order.remove(tileId)
            }
          }
        }
      }))
    },
    prepareSnapshot() {
      withoutUndo({ suppressWarning: true })
      self.savedOrder.replace(self.order)
    },
    insertTile(tileId: string, options?: ITileInRowOptions) {
      const { x = 50, y = 50, width = undefined, height = undefined } = isFreeTileInRowOptions(options) ? options : {}
      self.tiles.set(tileId, { tileId, x, y, width, height })
    },
    removeTile(tileId: string) {
      self.tiles.delete(tileId)
    },
    moveTileToTop(tileId: string) {
      withoutUndo({ suppressWarning: true })
      const index = self.order.findIndex(id => id === tileId)
      if ((index >= 0) && (index < self.order.length - 1)) {
        self.order.splice(index, 1)
        self.order.push(tileId)
      }
    },
    setTileDimensions(tileId: string, dimensions: { width?: number, height?: number }) {
      const freeTileLayout = self.getNode(tileId)
      freeTileLayout?.setSize(dimensions.width, dimensions.height)
    }
  }))
export interface IFreeTileRow extends Instance<typeof FreeTileRow> {}

export function isFreeTileRow(row?: ITileRowModel): row is IFreeTileRow {
  return row?.type === "free"
}
