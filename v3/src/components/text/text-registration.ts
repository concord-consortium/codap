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
//   defaultContent: () => createTextModel()
// })

registerTileComponentInfo({
  type: "CodapText",
  TitleBar: ComponentTitleBar,
  Component: PlaceholderTileComponent,
  tileEltClass: "codap-text",
  Icon: TextIcon,
  shelf: {
    position: 6,
    label: "DG.ToolButtonData.textButton.title",
    hint: "DG.ToolButtonData.textButton.toolTip"
  },
  defaultWidth: 300,
  defaultHeight: 300
})
