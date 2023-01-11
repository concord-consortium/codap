import { types, Instance, SnapshotOut } from "mobx-state-tree"
import { ITileModel } from "../tile-model"
import { TileContentModel } from "../tile-content"

export const kPlaceholderTileType = "Placeholder"

export const PlaceholderContentModel = TileContentModel
  .named("PlaceholderContent")
  .props({
    type: types.optional(types.literal(kPlaceholderTileType), kPlaceholderTileType),
    sectionId: ""
  })
  .actions(self => ({
    setSectionId(sectionId = "") {
      self.sectionId = sectionId
    }
  }))

export type PlaceholderContentModelType = Instance<typeof PlaceholderContentModel>
export type PlaceholderContentSnapshotOutType = SnapshotOut<typeof PlaceholderContentModel>

export function isPlaceholderContent(content: any): content is PlaceholderContentModelType {
  return content?.type === kPlaceholderTileType
}

export function isPlaceholderTile(tile?: ITileModel): tile is ITileModel {
  return tile?.content?.type === kPlaceholderTileType
}

export function getPlaceholderSectionId(tile?: ITileModel) {
  return tile && isPlaceholderContent(tile.content) ? tile.content.sectionId : undefined
}
