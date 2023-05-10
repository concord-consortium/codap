import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { kGraphIdPrefix, kGraphTileClass, kGraphTileType } from "./graph-defs"
import { createGraphModel, GraphModel } from "./models/graph-model"
import { GraphComponentTitleBar } from "./components/graph-component-title-bar"
import { GraphComponent } from "./components/graph-component"
import { GraphInspector } from "./components/graph-inspector"
import GraphIcon from '../../assets/icons/icon-graph.svg'
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { v2GraphImporter } from "./v2-graph-importer"

registerTileContentInfo({
  type: kGraphTileType,
  prefix: kGraphIdPrefix,
  modelClass: GraphModel,
  defaultContent: () => createGraphModel()
})

registerTileComponentInfo({
  type: kGraphTileType,
  TitleBar: GraphComponentTitleBar,
  Component: GraphComponent,
  InspectorPanel: GraphInspector,
  tileEltClass: kGraphTileClass,
  Icon: GraphIcon,
  shelf: {
    position: 2,
    label: "DG.ToolButtonData.graphButton.title",
    hint: "DG.ToolButtonData.graphButton.toolTip"
  },
  defaultWidth: 300,
  defaultHeight: 300
})

registerV2TileImporter("DG.GraphView", v2GraphImporter)
