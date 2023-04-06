import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
// import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { PlaceholderTileComponent } from "../tiles/placeholder/placeholder-tile"
import { ComponentTitleBar } from "../component-title-bar"
import { ToolshelfButton } from "../tool-shelf/tool-shelf"
import TextIcon from '../../assets/icons/icon-text.svg'

export const kTextIdPrefix = "TEXT"

// registerTileContentInfo({
//   type: "CodapText",
//   prefix: kTextIdPrefix,
//   modelClass: TextModel,
//   defaultContent: () => createTextModel()
// })

registerTileComponentInfo({
  type: "CodapText",
  TitleBar: ComponentTitleBar,
  Component: PlaceholderTileComponent,
  tileEltClass: "codap-text",
  Icon: TextIcon,
  ComponentToolshelfButton: ToolshelfButton,
  position: 6,
  toolshelfButtonOptions: {iconLabel: "DG.ToolButtonData.textButton.title",
                            buttonHint: "DG.ToolButtonData.textButton.toolTip"},
  defaultWidth: 300,
  defaultHeight: 300
})
