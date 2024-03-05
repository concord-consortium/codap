import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { CalculatorComponent } from "./calculator"
import { kCalculatorTileClass, kCalculatorTileType } from "./calculator-defs"
import { CalculatorModel, ICalculatorSnapshot } from "./calculator-model"
import { CalculatorTitleBar } from "./calculator-title-bar"
import CalcIcon from '../../assets/icons/icon-calc.svg'
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2CalculatorComponent } from "../../v2/codap-v2-types"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { typedId } from "../../utilities/js-utils"

export const kCalculatorIdPrefix = "CALC"

registerTileContentInfo({
  type: kCalculatorTileType,
  prefix: kCalculatorIdPrefix,
  modelClass: CalculatorModel,
  defaultContent: () => ({ type: kCalculatorTileType }),
  isSingleton: true
})

registerTileComponentInfo({
  type: kCalculatorTileType,
  TitleBar: CalculatorTitleBar,
  Component: CalculatorComponent,
  tileEltClass: kCalculatorTileClass,
  Icon: CalcIcon,
  shelf: {
    position: 5,
    labelKey: "DG.ToolButtonData.calcButton.title",
    hintKey: "DG.ToolButtonData.calcButton.toolTip"
  },
  isFixedWidth: true,
  isFixedHeight: true,
  // must be in sync with rendered size for auto placement code
  defaultHeight: 162,
  defaultWidth: 137
})

registerV2TileImporter("DG.Calculator", ({ v2Component, insertTile }) => {
  if (!isV2CalculatorComponent(v2Component)) return

  const { name = "", title = "" } = v2Component.componentStorage

  const content: ICalculatorSnapshot = {
    type: kCalculatorTileType,
    name
  }
  const calculatorTileSnap: ITileModelSnapshotIn = { id: typedId(kCalculatorIdPrefix), title, content }
  const calculatorTile = insertTile(calculatorTileSnap)

  return calculatorTile
})
