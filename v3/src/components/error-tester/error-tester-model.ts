import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kErrorTesterTileType } from "./error-tester-defs"

export const ErrorTesterModel = TileContentModel
  .named("ErrorTesterModel")
  .props({
    type: types.optional(types.literal(kErrorTesterTileType), kErrorTesterTileType),
    name: ""
  })
  .views(() => ({
    get isUserResizable() {
      return false
    }
  }))
export interface IErrorTesterModel extends Instance<typeof ErrorTesterModel> {}
export interface IErrorTesterSnapshot extends SnapshotIn<typeof ErrorTesterModel> {}

export function isErrorTesterModel(model?: ITileContentModel): model is IErrorTesterModel {
  return model?.type === kErrorTesterTileType
}
