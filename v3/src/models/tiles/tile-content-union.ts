import { types } from "mobx-state-tree"
import { getTileContentInfo, getTileContentModels } from "./tile-content-info"
import { TileContentModel } from "./tile-content"
import { UnknownContentModel } from "./unknown-content"

export function tileContentFactory(snapshot: any) {
  const tileType: string | undefined = snapshot?.type
  return getTileContentInfo(tileType)?.modelClass || UnknownContentModel
}

/**
 * A dynamic union of tile content models. Its typescript type is `TileContentModel`.
 *
 * This uses MST's `late()`. It appears that `late()` runs the first time the
 * union is actually used by MST. For example to deserialize a snapshot or to
 * create an model instance. For this to work properly, these uses need to
 * happen after all necessary tiles are registered.
 *
 * By default a late type like this will have a type of `any`. All types in this
 * late union extend TileContentModel, so it is overridden to be
 * TileContentModel. This doesn't affect the MST runtime types.
 */
export const TileContentUnion = types.late<typeof TileContentModel>(() => {
  const contentModels = getTileContentModels()
  return types.union({ dispatcher: tileContentFactory }, ...contentModels) as typeof TileContentModel
})
