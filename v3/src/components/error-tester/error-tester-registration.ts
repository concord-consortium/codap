import ErrorTesterIcon from "../../assets/icons/icon-error-tester.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { urlParams } from "../../utilities/url-params"
import { ComponentTitleBar } from "../component-title-bar"
import { ErrorTesterComponent } from "./error-tester"
import { kErrorTesterTileClass, kErrorTesterTileType } from "./error-tester-defs"
import { ErrorTesterModel } from "./error-tester-model"

export const kErrorTesterIdPrefix = "ERR"

if (urlParams.errorTester) {
  // Register the error tester tile type if the URL parameter is set
  registerTileContentInfo({
    type: kErrorTesterTileType,
    prefix: kErrorTesterIdPrefix,
    modelClass: ErrorTesterModel,
    defaultContent: () => ({ type: kErrorTesterTileType }),
    defaultName: () => "Error Tester",
    isSingleton: true,
    getTitle: (tile: ITileLikeModel) => {
      return tile.title || "Error Tester"
    }
  })

  registerTileComponentInfo({
    type: kErrorTesterTileType,
    TitleBar: ComponentTitleBar,
    Component: ErrorTesterComponent,
    tileEltClass: kErrorTesterTileClass,
    Icon: ErrorTesterIcon,
    shelf: {
      position: 7,
      // TODO: Update these values, they seem to have to be translation keys.
      labelKey: "DG.ToolButtonData.errorTesterButton.title",
      hintKey: "DG.ToolButtonData.errorTesterButton.toolTip",
      undoStringKey: "DG.Undo.errorTester.create",
      redoStringKey: "DG.Redo.errorTester.create"
    },
    isFixedWidth: true,
    isFixedHeight: true,
    // must be in sync with rendered size for auto placement code
    defaultHeight: 162,
    defaultWidth: 137
  })

  // TODO: What should we do with the v2 component here?
  // Shortly v2 saving is going to enabled by default so if we don't have one
  // the error tester component can't be saved.
  registerComponentHandler(kErrorTesterTileType, {
    create() {
      return { content: { type: kErrorTesterTileType } }
    },
    get(content) {
      return {}
    }
  })
}
