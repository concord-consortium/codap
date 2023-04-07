import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
// import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { PlaceholderTileComponent } from "../tiles/placeholder/placeholder-tile"
import { ComponentTitleBar } from "../component-title-bar"
import MapIcon from "../../assets/icons/icon-map.svg"

export const kMapIdPrefix = "MAP_"

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
  shelf: {
    position: 3,
    label: "DG.ToolButtonData.mapButton.title",
    hint: "DG.ToolButtonData.mapButton.toolTip"
  },
  defaultWidth: 300,
  defaultHeight: 300
})
