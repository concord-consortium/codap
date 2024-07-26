import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import {kMapIdPrefix, kMapTileClass, kMapTileType} from "./map-defs"
import {kDefaultMapHeight, kDefaultMapWidth} from "./map-types"
import MapIcon from "../../assets/icons/icon-map.svg"
import {createMapContentModel, MapContentModel} from "./models/map-content-model"
import {MapComponentTitleBar} from "./components/map-component-title-bar"
import {MapComponent} from "./components/map-component"
import {MapInspector} from "./components/map-inspector"
import {registerV2TileImporter} from "../../v2/codap-v2-tile-importers"
import {v2MapImporter} from "./v2-map-importer"
import { t } from "../../utilities/translation/translate"

registerTileContentInfo({
  type: kMapTileType,
  prefix: kMapIdPrefix,
  modelClass: MapContentModel,
  defaultContent: () => createMapContentModel(),
  defaultName: () => t("DG.DocumentController.mapTitle"),
  getTitle: (tile: ITileLikeModel) => {
    return tile.title || t("DG.DocumentController.mapTitle")
  }
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
  defaultWidth: kDefaultMapWidth,
  defaultHeight: kDefaultMapHeight
})

registerV2TileImporter("DG.MapView", v2MapImporter)
