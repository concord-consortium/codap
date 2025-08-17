import { IAnyStateTreeNode } from "mobx-state-tree"
import { SetRequired } from "type-fest"
import GraphIcon from "../../assets/icons/icon-graph.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerDataDisplayHandler } from "../../data-interactive/handlers/data-display-handler"
import { idOfChildmostCollectionForAttributes } from "../../models/data/data-set-utils"
import { SharedDataSet } from "../../models/shared/shared-data-set"
import { getMetadataFromDataSet } from "../../models/shared/shared-data-utils"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"
import { registerV2PostImportSnapshotProcessor, registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { ComponentTitleBar } from "../component-title-bar"
import { PlottedFunctionFormulaAdapter } from "./adornments/plotted-function/plotted-function-formula-adapter"
import { PlottedValueFormulaAdapter }
  from "./adornments/univariate-measures/plotted-value/plotted-value-formula-adapter"
import { GraphComponent } from "./components/graph-component"
import { GraphInspector } from "./components/graph-inspector"
import { graphComponentHandler } from "./graph-component-handler"
import { graphDataDisplayHandler } from "./graph-data-display-handler"
import { kGraphIdPrefix, kGraphTileClass, kGraphTileType, kV2GraphType } from "./graph-defs"
import { GraphContentModel, IGraphContentModelSnapshot, isGraphContentModel } from "./models/graph-content-model"
import { kGraphDataConfigurationType } from "./models/graph-data-configuration-model"
import { GraphFilterFormulaAdapter } from "./models/graph-filter-formula-adapter"
import { BarChartFormulaAdapter } from "./plots/bar-chart/bar-chart-formula-adapter"
import { kGraphPointLayerType } from "./models/graph-point-layer-model"
import { v2GraphExporter } from "./v2-graph-exporter"
import { v2GraphImporter, v2GraphPostImportSnapshotProcessor } from "./v2-graph-importer"

GraphFilterFormulaAdapter.register()
BarChartFormulaAdapter.register()

registerTileContentInfo({
  type: kGraphTileType,
  prefix: kGraphIdPrefix,
  modelClass: GraphContentModel,
  defaultContent: options => {
    // auto-connect to data set if there's only one available
    const sharedModelManager = options?.env?.sharedModelManager
    const sharedDataSets = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>("SharedDataSet")
    const onlyDataSet = sharedDataSets?.length === 1 ? sharedDataSets[0].dataSet : undefined
    const onlyMetadata = onlyDataSet && getMetadataFromDataSet(onlyDataSet)
    const graphTileSnapshot: SetRequired<IGraphContentModelSnapshot, "type"> = {
      type: kGraphTileType,
      layers: [{
        type: kGraphPointLayerType,
        dataConfiguration: {
          type: kGraphDataConfigurationType,
          dataset: onlyDataSet?.id,
          metadata: onlyMetadata?.id
        }
      }]
    }
    return graphTileSnapshot
  },
  getTitle: (tile: ITileLikeModel) => {
    const graphModel = isGraphContentModel(tile?.content) ? tile.content : undefined
    const uniqueAttributes = graphModel?.dataConfiguration.uniqueAttributes ?? []
    const data = graphModel ? graphModel.dataset : undefined
    const childMostCollectionId = idOfChildmostCollectionForAttributes(uniqueAttributes, data)
    const childMostCollectionTitle = childMostCollectionId ? data?.getCollection(childMostCollectionId)?.title : ""
    const numCollections = data?.collections.length || 0
    const lastCollectionTitle = numCollections ? data?.collections[numCollections - 1].title : ""
    return tile.title || childMostCollectionTitle || lastCollectionTitle || ""
  },
  getFormulaAdapters: (node: IAnyStateTreeNode) => [
    GraphFilterFormulaAdapter.get(node),
    PlottedFunctionFormulaAdapter.get(node),
    PlottedValueFormulaAdapter.get(node),
    BarChartFormulaAdapter.get(node)
  ]
})

registerTileComponentInfo({
  type: kGraphTileType,
  TitleBar: ComponentTitleBar,
  Component: GraphComponent,
  InspectorPanel: GraphInspector,
  tileEltClass: kGraphTileClass,
  Icon: GraphIcon,
  shelf: {
    position: 2,
    labelKey: "DG.ToolButtonData.graphButton.title",
    hintKey: "DG.ToolButtonData.graphButton.toolTip",
    undoStringKey: "DG.Undo.graphComponent.create",
    redoStringKey: "DG.Redo.graphComponent.create"
  },
  defaultWidth: 300,
  defaultHeight: 300
})

registerV2TileExporter(kGraphTileType, v2GraphExporter)
registerV2TileImporter("DG.GraphView", v2GraphImporter)
registerV2PostImportSnapshotProcessor("Graph", v2GraphPostImportSnapshotProcessor)

registerComponentHandler(kV2GraphType, graphComponentHandler)
registerDataDisplayHandler(kV2GraphType, graphDataDisplayHandler)
