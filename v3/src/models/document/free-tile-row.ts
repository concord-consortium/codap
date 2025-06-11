import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { ITileInRowOptions, ITileRowModel, TileRowModel } from "./tile-row"
import { withoutUndo } from "../history/without-undo"

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
  zIndex: types.maybe(types.number),
  isHidden: types.maybe(types.boolean),
  isMinimized: types.maybe(types.boolean)
})
.preProcessSnapshot(snap => {
  if (snap.isHidden && snap.isMinimized) {
    // can't be both minimized and hidden
    const { isMinimized, ...others } = snap
    return { ...others }
  }
  return snap
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
  },
  setSize(width?: number, height?: number) {
    self.width = width
    self.height = height
  },
  setZIndex(zIndex: number) {
    self.zIndex = Math.trunc(zIndex)
  },
  setHidden(isHidden: boolean) {
    // only store it if it's true
    self.isHidden = isHidden || undefined
    // can't be both hidden and minimized
    if (isHidden) self.isMinimized = undefined
  },
  setMinimized(isMinimized: boolean) {
    // only store it if it's true
    self.isMinimized = isMinimized || undefined
  }
}))

export interface IFreeTileLayout extends Instance<typeof FreeTileLayout> {}
export interface IFreeTileLayoutSnapshot extends SnapshotIn<typeof FreeTileLayout> {}

export function isFreeTileLayout(layout?: any): layout is IFreeTileLayout {
  return !!layout && typeof layout === "object" && !!layout.tileId &&
          Number.isFinite(layout.x) && Number.isFinite(layout.y)
}

export type IFreeTileInRowOptions = ITileInRowOptions & Omit<IFreeTileLayoutSnapshot, "tileId"> & {
  animateCreation?: boolean
}
export const isFreeTileInRowOptions = (options?: ITileInRowOptions): options is IFreeTileInRowOptions =>
              !!options &&
                (("x" in options && options.x != null) && ("y" in options && options.y != null) ||
                ("isHidden" in options && options.isHidden != null) ||
                ("isMinimized" in options && options.isMinimized != null))

/*
  Tiles are represented as a map of layouts and an array of tile ids representing the order.
 */

export const FreeTileRow = TileRowModel
  .named("FreeTileRow")
  .props({
    type: types.optional(types.literal("free"), "free"),
    tiles: types.map(FreeTileLayout), // tile id => layout
    maxZIndex: 0
  })
  .volatile(self => ({
    // tile ids of tiles created by user whose creation should be animated
    animateCreationTiles: new Set<string>()
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
      let topTileId: string | undefined
      let topZIndex = 0
      self.tiles.forEach(tileLayout => {
        if ((tileLayout.zIndex ?? 0) > topZIndex) {
          topTileId = tileLayout.tileId
          topZIndex = tileLayout.zIndex ?? 0
        }
      })
      return topTileId
    },
    // returns tile ids in traversal order
    get tileIds() {
      return Array.from(self.tiles.keys())
    },
    get tileCount() {
      return self.tiles.size
    },
    hasTile(tileId: string) {
      return self.tiles.has(tileId)
    },
    getTileLayout(tileId: string): IFreeTileLayout | undefined {
      return self.tiles.get(tileId)
    },
    getTileDimensions(tileId: string) {
      const freeTileLayout = self.getNode(tileId)
      return { width: freeTileLayout?.width, height: freeTileLayout?.height }
    },
    getTilePosition(tileId: string) {
      const freeTileLayout = self.getNode(tileId)
      return { left: freeTileLayout?.x, top: freeTileLayout?.y }
    }
  }))
  .actions(self => ({
    nextZIndex() {
      return ++self.maxZIndex
    },
    setMaxZIndex(zIndex: number) {
      self.maxZIndex = zIndex
    },
    insertTile(tileId: string, options?: ITileInRowOptions) {
      const {
        x = 50, y = 50, width = undefined, height = undefined, zIndex = this.nextZIndex(),
        isHidden = undefined, isMinimized = undefined, animateCreation = false
      } = isFreeTileInRowOptions(options) ? options : {}
      self.tiles.set(tileId, { tileId, x, y, width, height, zIndex, isHidden, isMinimized })
      animateCreation && self.animateCreationTiles.add(tileId)
    },
    removeTile(tileId: string) {
      self.tiles.delete(tileId)
    },
    moveTileToTop(tileId: string, allowBringToFront = true) {
      if (!allowBringToFront) return

      withoutUndo({ suppressWarning: true })
      self.getNode(tileId)?.setZIndex(this.nextZIndex())
    },
    setTileDimensions(tileId: string, dimensions: { width?: number, height?: number }) {
      const freeTileLayout = self.getNode(tileId)
      freeTileLayout?.setSize(dimensions.width, dimensions.height)
    },
    setTilePosition(tileId: string, position: { x?: number, y?: number }) {
      const freeTileLayout = self.getNode(tileId)
      if (freeTileLayout && (position.x != null || position.y != null)) {
        const { x = freeTileLayout.x, y = freeTileLayout.y } = position
        freeTileLayout?.setPosition(x, y)
      }
    }
  }))
export interface IFreeTileRow extends Instance<typeof FreeTileRow> {}

export function isFreeTileRow(row?: ITileRowModel): row is IFreeTileRow {
  return row?.type === "free"
}
