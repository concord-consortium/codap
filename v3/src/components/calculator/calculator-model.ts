import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCalculatorTileType } from "./calculator-defs"

export const CalculatorModel = TileContentModel
  .named("CalculatorModel")
  .props({
    type: types.optional(types.literal(kCalculatorTileType), kCalculatorTileType),
    name: "",
    value: ""
  })
  .actions(self => ({
    setValue(value = "") {
      self.value = value
    }
  }))
export interface ICalculatorModel extends Instance<typeof CalculatorModel> {}
export interface ICalculatorSnapshot extends SnapshotIn<typeof CalculatorModel> {}

export function isCalculatorModel(model?: ITileContentModel): model is ICalculatorModel {
  return model?.type === kCalculatorTileType
}
