import { IAnyStateTreeNode } from "mobx-state-tree"
import { SetRequired } from "type-fest"
import GraphIcon from "../../assets/icons/icon-graph.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { SharedDataSet } from "../../models/shared/shared-data-set"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { ComponentTitleBar } from "../component-title-bar"
import { PlottedFunctionFormulaAdapter } from "./adornments/plotted-function/plotted-function-formula-adapter"
import {
  PlottedValueFormulaAdapter
} from "./adornments/univariate-measures/plotted-value/plotted-value-formula-adapter"
import { GraphComponent } from "./components/graph-component"
import { GraphInspector } from "./components/graph-inspector"
import { graphComponentHandler } from "./graph-component-handler"
import { kGraphIdPrefix, kGraphTileClass, kGraphTileType, kV2GraphType } from "./graph-defs"
import { GraphContentModel, IGraphContentModelSnapshot, isGraphContentModel } from "./models/graph-content-model"
import { kGraphDataConfigurationType } from "./models/graph-data-configuration-model"
import { GraphFilterFormulaAdapter } from "./models/graph-filter-formula-adapter"
import { kGraphPointLayerType } from "./models/graph-point-layer-model"
import { v2GraphImporter } from "./v2-graph-importer"

GraphFilterFormulaAdapter.register()

registerTileContentInfo({
  type: kGraphTileType,
  prefix: kGraphIdPrefix,
  modelClass: GraphContentModel,
  defaultContent: options => {
    // auto-connect to data set if there's only one available
    const sharedModelManager = options?.env?.sharedModelManager
    const sharedDataSets = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>("SharedDataSet")
    const onlyDataSet = sharedDataSets?.length === 1 ? sharedDataSets[0].dataSet : undefined
    const onlyMetadata = onlyDataSet && getSharedCaseMetadataFromDataset(onlyDataSet)
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
    const data = isGraphContentModel(tile?.content) ? tile.content.dataset : undefined
    return tile.title || data?.title || ""
  },
  getFormulaAdapters: (node: IAnyStateTreeNode) => [
    GraphFilterFormulaAdapter.get(node),
    PlottedFunctionFormulaAdapter.get(node),
    PlottedValueFormulaAdapter.get(node)
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

registerV2TileImporter("DG.GraphView", v2GraphImporter)

registerComponentHandler(kV2GraphType, graphComponentHandler)
