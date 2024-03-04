import { SetRequired } from "type-fest"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { kGraphIdPrefix, kGraphTileClass, kGraphTileType } from "./graph-defs"
import { SharedDataSet } from "../../models/shared/shared-data-set"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { GraphContentModel, IGraphContentModelSnapshot } from "./models/graph-content-model"
import { kGraphDataConfigurationType } from "./models/graph-data-configuration-model"
import { kGraphPointLayerType } from "./models/graph-point-layer-model"
import { GraphComponentTitleBar } from "./components/graph-component-title-bar"
import { GraphComponent } from "./components/graph-component"
import { GraphInspector } from "./components/graph-inspector"
import GraphIcon from '../../assets/icons/icon-graph.svg'
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { v2GraphImporter } from "./v2-graph-importer"

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
  }
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
    labelKey: "DG.ToolButtonData.graphButton.title",
    hintKey: "DG.ToolButtonData.graphButton.toolTip"
  },
  defaultWidth: 300,
  defaultHeight: 300
})

registerV2TileImporter("DG.GraphView", v2GraphImporter)
