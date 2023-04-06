import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
// import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { PlaceholderTileComponent } from "../tiles/placeholder/placeholder-tile"
import { ComponentTitleBar } from "../component-title-bar"
import { ToolshelfButton } from "../tool-shelf/tool-shelf"
import MapIcon from "../../assets/icons/icon-map.svg"

export const kMapIdPrefix = "_MAP"

// registerTileContentInfo({
//   type: "CodapPMap",
//   prefix: kMapIdPrefix,
//   modelClass: MapModel,
//   defaultContent: () => createMapModel()
// })

registerTileComponentInfo({
  type: "CodapMap",
  TitleBar: ComponentTitleBar,
  Component: PlaceholderTileComponent,
  tileEltClass: "codap-map",
  Icon: MapIcon,
  ComponentToolshelfButton: ToolshelfButton,
  position: 3,
  toolshelfButtonOptions: {iconLabel: "DG.ToolButtonData.mapButton.title",
                            buttonHint: "DG.ToolButtonData.mapButton.toolTip"},
  defaultWidth: 300,
  defaultHeight: 300
})
