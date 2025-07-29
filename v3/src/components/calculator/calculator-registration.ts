import CalcIcon from "../../assets/icons/icon-calc.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2CalculatorComponent } from "../../v2/codap-v2-types"
import { CalculatorComponent } from "./calculator"
import { kCalculatorTileClass, kCalculatorTileType, kV2CalculatorDGType, kV2CalculatorDIType } from "./calculator-defs"
import { CalculatorModel, ICalculatorSnapshot } from "./calculator-model"
import { CalculatorTitleBar } from "./calculator-title-bar"

export const kCalculatorIdPrefix = "CALC"

registerTileContentInfo({
  type: kCalculatorTileType,
  prefix: kCalculatorIdPrefix,
  modelClass: CalculatorModel,
  defaultContent: () => ({ type: kCalculatorTileType }),
  defaultName: () => t("DG.DocumentController.calculatorTitle"),
  isSingleton: true,
  getTitle: (tile: ITileLikeModel) => {
    return tile.title || t("DG.DocumentController.calculatorTitle")
  }
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
    hintKey: "DG.ToolButtonData.calcButton.toolTip",
    undoStringKey: "DG.Undo.toggleComponent.add.calcView",
    redoStringKey: "DG.Redo.toggleComponent.add.calcView"
  },
  isFixedWidth: true,
  isFixedHeight: true,
  // must be in sync with rendered size for auto placement code
  defaultHeight: 162,
  defaultWidth: 137
})

registerV2TileImporter(kV2CalculatorDGType, ({ v2Component, insertTile }) => {
  if (!isV2CalculatorComponent(v2Component)) return

  const { guid, componentStorage } = v2Component
  const { name = "", title, userSetTitle } = componentStorage || {}

  const content: ICalculatorSnapshot = {
    type: kCalculatorTileType,
    name
  }
  const calculatorTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kCalculatorIdPrefix, guid), name, _title: title, userSetTitle, content
  }
  const calculatorTile = insertTile(calculatorTileSnap)

  return calculatorTile
})

registerV2TileExporter(kCalculatorTileType, () => {
  // Calculator doesn't have calculator-specific storage
  return { type: kV2CalculatorDGType }
})

registerComponentHandler(kV2CalculatorDIType, {
  create() {
    return { content: { type: kCalculatorTileType } }
  },
  get(content) {
    return {}
  }
})
