import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import {kMapTileClass, kMapTileType} from "./map-defs"
import MapIcon from "../../assets/icons/icon-map.svg"
import {createMapContentModel, MapContentModel} from "./models/map-content-model"
import {MapComponentTitleBar} from "./components/map-component-title-bar"
import {MapComponent} from "./components/map-component"
import {MapInspector} from "./components/map-inspector"

export const kMapIdPrefix = "MAP_"

registerTileContentInfo({
  type: kMapTileType,
  prefix: kMapIdPrefix,
  modelClass: MapContentModel,
  defaultContent: () => createMapContentModel()
})

registerTileComponentInfo({
  type: kMapTileType,
  TitleBar: MapComponentTitleBar,
  Component: MapComponent,
  InspectorPanel: MapInspector,
  tileEltClass: kMapTileClass,
  Icon: MapIcon,
  shelf: {
    position: 3,
    labelKey: "DG.ToolButtonData.mapButton.title",
    hintKey: "DG.ToolButtonData.mapButton.toolTip"
  },
  defaultWidth: 300,
  defaultHeight: 300
})
