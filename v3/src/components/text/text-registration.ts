import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
// import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { PlaceholderTileComponent } from "../tiles/placeholder/placeholder-tile"
import { ComponentTitleBar } from "../component-title-bar"
import TextIcon from '../../assets/icons/icon-text.svg'

export const kTextIdPrefix = "TEXT"

// registerTileContentInfo({
//   type: "CodapText",
//   prefix: kTextIdPrefix,
//   modelClass: TextModel,
//   defaultContent: () => ({ type: kCodapTextTileType })
// })

registerTileComponentInfo({
  type: "CodapText",
  TitleBar: ComponentTitleBar,
  Component: PlaceholderTileComponent,
  tileEltClass: "codap-text",
  Icon: TextIcon,
  shelf: {
    position: 6,
    labelKey: "DG.ToolButtonData.textButton.title",
    hintKey: "DG.ToolButtonData.textButton.toolTip",
    undoStringKey: "DG.Undo.textComponent.create",
    redoStringKey: "DG.Redo.textComponent.create"
  },
  defaultWidth: 300,
  defaultHeight: 300
})
