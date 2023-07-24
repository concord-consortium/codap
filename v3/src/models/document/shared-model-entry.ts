import { types, Instance, SnapshotIn, SnapshotOut } from "mobx-state-tree"
import { TileModel, ITileModel } from "../tiles/tile-model"
import { SharedModelUnion } from "../shared/shared-model-manager"

// This intermediate type is added so we can store which tiles are using the
// shared model. It is also necessary so the SharedModelUnion can be evaluated
// late. If the sharedModelMap was a map directly to SharedModelUnion the late
// evaluation would happen immediately and not pick up the registered shared
// model tiles. This issue with using late and maps is documented here:
// `src/models/mst.test.ts`

export const SharedModelEntry = types.model("SharedModelEntry", {
  sharedModel: SharedModelUnion,
  provider: types.safeReference(TileModel, { acceptsUndefined: true }),
  tiles: types.array(types.safeReference(TileModel, { acceptsUndefined: false }))
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
export interface SharedModelEntryType extends Instance<typeof SharedModelEntry> { }
export interface SharedModelEntrySnapshotType extends SnapshotIn<typeof SharedModelEntry> { }

export const SharedModelMap = types.map(SharedModelEntry)
export type SharedModelMapType = Instance<typeof SharedModelMap>
export type SharedModelMapSnapshotOutType = SnapshotOut<typeof SharedModelMap>
