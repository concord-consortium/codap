import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { CalculatorComponent } from "./calculator"
import { kCalculatorTileClass, kCalculatorTileType } from "./calculator-defs"
import { CalculatorModel } from "./calculator-model"
import { CalculatorTitleBar } from "./calculator-title-bar"
import CalcIcon from '../../assets/icons/icon-calc.svg'
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2CalculatorComponent } from "../../v2/codap-v2-types"
import { TileModel } from "../../models/tiles/tile-model"
import { typedId } from "../../utilities/js-utils"
import { ToolshelfButton } from "../tool-shelf/tool-shelf"

export const kCalculatorIdPrefix = "CALC"

registerTileContentInfo({
  type: kCalculatorTileType,
  prefix: kCalculatorIdPrefix,
  modelClass: CalculatorModel,
  defaultContent: () => CalculatorModel.create()
})

registerTileComponentInfo({
  type: kCalculatorTileType,
  TitleBar: CalculatorTitleBar,
  Component: CalculatorComponent,
  tileEltClass: kCalculatorTileClass,
  Icon: CalcIcon,
  ComponentToolshelfButton: ToolshelfButton,
  position: 5,
  toolshelfButtonOptions: {iconLabel: "DG.ToolButtonData.calcButton.title",
                            buttonHint: "DG.ToolButtonData.calcButton.toolTip"},
  isSingleton: true,
  isFixedWidth: true,
  isFixedHeight: true,
  // must be in sync with rendered size for auto placement code
  defaultHeight: 162,
  defaultWidth: 137
})

registerV2TileImporter("DG.Calculator", ({ v2Component, insertTile }) => {
  if (!isV2CalculatorComponent(v2Component)) return

  const { name = "", title = "" } = v2Component.componentStorage
  const calculatorTile = TileModel.create({
    id: typedId(kCalculatorIdPrefix),
    title,
    content: CalculatorModel.create({ name })
  })
  insertTile(calculatorTile)

  return calculatorTile
})
