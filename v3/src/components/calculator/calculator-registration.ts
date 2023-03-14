import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { CalculatorComponent } from "./calculator"
import { kCalculatorTileClass, kCalculatorTileType } from "./calculator-defs"
import { CalculatorModel } from "./calculator-model"
import { CalculatorTitleBar } from "./calculator-title-bar"
import CalcIcon from '../../assets/icons/icon-calc.svg'

registerTileContentInfo({
  type: kCalculatorTileType,
  prefix: "CALC",
  modelClass: CalculatorModel,
  defaultContent: () => CalculatorModel.create()
})

registerTileComponentInfo({
  type: kCalculatorTileType,
  TitleBar: CalculatorTitleBar,
  Component: CalculatorComponent,
  tileEltClass: kCalculatorTileClass,
  Icon: CalcIcon,
  isSingleton: true,
  height: 162,
  width: 145,
})
