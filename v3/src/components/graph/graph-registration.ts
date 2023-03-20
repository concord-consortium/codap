import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { kGraphTileClass, kGraphTileType } from "./graph-defs"
import { createGraphModel, GraphModel } from "./models/graph-model"
import { GraphComponent } from "./components/graph-component"
import { GraphTitleBar } from "./components/graph-title-bar"
import GraphIcon from '../../assets/icons/icon-graph.svg'
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2GraphComponent } from "../../v2/codap-v2-types"
import { TileModel } from "../../models/tiles/tile-model"
import { typedId } from "../../utilities/js-utils"
import { GraphInspector } from "./components/graph-inspector"

export const kGraphIdPrefix = "GRPH"

registerTileContentInfo({
  type: kGraphTileType,
  prefix: kGraphIdPrefix,
  modelClass: GraphModel,
  defaultContent: () => createGraphModel()
})

registerTileComponentInfo({
  type: kGraphTileType,
  TitleBar: GraphTitleBar,
  Component: GraphComponent,
  InspectorPanel: GraphInspector,
  tileEltClass: kGraphTileClass,
  Icon: GraphIcon,
  defaultWidth: 300,
  defaultHeight: 300
})

registerV2TileImporter("DG.GraphView", ({ v2Component, v2Document, sharedModelManager, insertTile }) => {
  if (!isV2GraphComponent(v2Component)) return

  const { title = "", _links_ } = v2Component.componentStorage
  const graphTile = TileModel.create({
    id: typedId(kGraphIdPrefix),
    title,
    // TODO: flesh out graph model conversion
    content: createGraphModel()
  })
  insertTile(graphTile)

  // link shared model
  const contextId = _links_.context.id
  const { data, metadata } = v2Document.getDataAndMetadata(contextId)
  sharedModelManager?.addTileSharedModel(graphTile.content, data, true)
  sharedModelManager?.addTileSharedModel(graphTile.content, metadata, true)
})
