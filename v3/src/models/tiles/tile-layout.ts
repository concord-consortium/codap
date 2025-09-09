import { types, Instance } from "mobx-state-tree"

// generally negotiated with app, e.g. single column width for table
export const kDefaultMinWidth = 50

export const TileLayoutModel = types
  .model("TileLayout", {
    // for absolute layout systems
    x: types.maybe(types.number),
    y: types.maybe(types.number),
    width: types.maybe(types.number),
    height: types.maybe(types.number),
    // for row layout systems
    // first tile 100%, second tile 50%, etc.
    row: types.maybe(types.integer),
    widthPct: types.maybe(types.number),
    // for tree-like systems, e.g. react-mosaic
    // tile indices could be generated on save
    parent: types.maybe(types.integer),
    children: types.maybe(types.integer)
  })
  .views(self => ({
    // generally negotiated with app, e.g. single column width for table
    get minWidth() {
      return kDefaultMinWidth
    },
    // undefined by default, but can be negotiated with app,
    // e.g. width of all columns for table
    get maxWidth(): number | undefined {
      // eslint-disable-next-line no-useless-return
      return
    }
  }))

export type TileLayoutModelType = Instance<typeof TileLayoutModel>
