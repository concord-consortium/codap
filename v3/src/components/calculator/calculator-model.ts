import { Instance, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCalculatorTileType } from "./calculator-defs"

export const CalculatorModel = TileContentModel
  .named("CalculatorModel")
  .props({
    type: types.optional(types.literal(kCalculatorTileType), kCalculatorTileType),
    name: ""
  })
export interface ICalculatorModel extends Instance<typeof CalculatorModel> {}

export function isCalculatorModel(model?: ITileContentModel): model is ICalculatorModel {
  return model?.type === kCalculatorTileType
}
