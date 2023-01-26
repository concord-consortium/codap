import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { CalculatorComponent } from "./calculator"
import { kCalculatorTileClass, kCalculatorTileType } from "./calculator-defs"
import { CalculatorModel } from "./calculator-model"

registerTileContentInfo({
  type: kCalculatorTileType,
  modelClass: CalculatorModel,
  defaultContent: () => CalculatorModel.create()
})

registerTileComponentInfo({
  type: kCalculatorTileType,
  Component: CalculatorComponent,
  tileEltClass: kCalculatorTileClass
})
