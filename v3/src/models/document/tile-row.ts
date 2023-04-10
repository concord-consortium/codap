import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { typedId } from "../../utilities/js-utils"

/*
  Represents the layout of a set of tiles/components within a section of a document. The term
  "row" is derived from the legacy CLUE implementation of tiles arranged horizontally in a row,
  but can be interpreted to mean a separate space within which tiles/components can be laid out.
  "Derived" models can implement a simple horizontal row (e.g. LegacyTileRow), a free-form
  layout of overlapping tiles a la CODAP (FreeTileRow), a mosaic/dashboard layout of tiles
  (e.g. MosaicTileRow), or potentially any other arrangement.
 */

export interface ITileInRowOptions {
}

export const TileRowModel = types
  .model("TileRow", {
    id: types.optional(types.identifier, () => typedId("TROW")),
    type: types.optional(types.string, () => { throw "type must be overridden" }),
    title: types.maybe(types.string), // e.g. for separate pages of a multi-page document
    // the following properties are primarily for use in vertically scrolled rows, e.g. CLUE
    height: types.maybe(types.number),
    isSectionHeader: types.maybe(types.boolean),
    sectionId: types.maybe(types.string)
  })
  .views(self => ({
    get acceptDefaultInsert() {
      // "derived" models may override (e.g. single-"row" layouts like CODAP)
      return false
    },
    get removeWhenEmpty() {
      // "derived" models may override (e.g. multi-row layouts like CLUE)
      return false
    },
    get isEmpty() {
      // "derived" models should override
      return false
    },
    get tileCount() {
      // "derived" models should override
      return 0
    },
    get tileIds(): string[] {
      // "derived" models should override
      return []
    },
    hasTile(tileId: string) {
      // "derived" models should override
      return false
    }
  }))
  .actions(self => ({
    // undefined height == default to content height
    setRowHeight(height?: number) {
      self.height = height
    },
    setSectionHeader(sectionId: string) {
      self.isSectionHeader = true
      self.sectionId = sectionId
    },
    insertTile(tileId: string, options?: ITileInRowOptions) {
      // "derived" models should override
    },
    // return value indicates whether tile was removed
    removeTile(tileId: string) {
      // "derived" models should override
      return false
    },
    moveTileToTop(tileId: string) {
      // "derived" models should override
    }
  }))

export interface ITileRowModel extends Instance<typeof TileRowModel> {}
export interface ITileRowSnapshotIn extends SnapshotIn<typeof TileRowModel> {}
export interface ITileRowSnapshotOut extends SnapshotOut<typeof TileRowModel> {}
