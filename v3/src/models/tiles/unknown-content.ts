import { Instance, types } from "mobx-state-tree"
import { TileContentModel } from "./tile-content"
import { kUnknownTileType } from "./unknown-types"

export const UnknownContentModel = TileContentModel
  .named("UnknownContentModel")
  .props({
    type: types.optional(types.literal(kUnknownTileType), kUnknownTileType),
    original: types.maybe(types.string)
  })
  .preProcessSnapshot(snapshot => {
    const type = snapshot?.type
    return type && (type !== kUnknownTileType)
            ? {
              type: kUnknownTileType,
              original: JSON.stringify(snapshot)
            }
            : snapshot
  })
export interface IUnknownContentModel extends Instance<typeof UnknownContentModel> {}
