import MapIcon from "../../assets/icons/icon-map.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { t } from "../../utilities/translation/translate"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"
import { registerV2PostImportSnapshotProcessor, registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { ComponentTitleBar } from "../component-title-bar"
import { MapComponent } from "./components/map-component"
import { MapInspector } from "./components/map-inspector"
import { mapComponentHandler } from "./map-component-handler"
import {kMapIdPrefix, kMapTileClass, kMapTileType, kV2MapType} from "./map-defs"
import {kDefaultMapHeight, kDefaultMapWidth} from "./map-types"
import { createMapContentModel, MapContentModel } from "./models/map-content-model"
import { MapFilterFormulaAdapter } from "./models/map-filter-formula-adapter"
import { v2MapExporter } from "./v2-map-exporter"
import { v2MapImporter, v2MapPostImportSnapshotProcessor } from "./v2-map-importer"

MapFilterFormulaAdapter.register()

registerTileContentInfo({
  type: kMapTileType,
  prefix: kMapIdPrefix,
  modelClass: MapContentModel,
  defaultContent: () => createMapContentModel(),
  defaultName: () => t("DG.DocumentController.mapTitle"),
  getTitle: (tile: ITileLikeModel) => {
    return tile.title || t("DG.DocumentController.mapTitle")
  },
  getFormulaAdapters: (node) => [MapFilterFormulaAdapter.get(node)]
})

registerTileComponentInfo({
  type: kMapTileType,
  TitleBar: ComponentTitleBar,
  Component: MapComponent,
  InspectorPanel: MapInspector,
  tileEltClass: kMapTileClass,
  Icon: MapIcon,
  shelf: {
    position: 3,
    labelKey: "DG.ToolButtonData.mapButton.title",
    hintKey: "DG.ToolButtonData.mapButton.toolTip",
    undoStringKey: "DG.Undo.map.create",
    redoStringKey: "DG.Redo.map.create"
  },
  defaultWidth: kDefaultMapWidth,
  defaultHeight: kDefaultMapHeight
})

registerV2TileExporter(kMapTileType, v2MapExporter)
registerV2TileImporter("DG.MapView", v2MapImporter)
registerV2PostImportSnapshotProcessor("Map", v2MapPostImportSnapshotProcessor)

registerComponentHandler(kV2MapType, mapComponentHandler)
