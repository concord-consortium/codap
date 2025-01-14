import { SetRequired } from "type-fest"
import MapIcon from "../../assets/icons/icon-map.svg"
import { V2Map } from "../../data-interactive/data-interactive-component-types"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { appState } from "../../models/app-state"
import {
  getDataSetByNameOrId, getSharedCaseMetadataFromDataset, getSharedDataSets
} from "../../models/shared/shared-data-utils"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { t } from "../../utilities/translation/translate"
import {registerV2TileImporter} from "../../v2/codap-v2-tile-importers"
import { ComponentTitleBar } from "../component-title-bar"
import {
  AttributeDescriptionsMapSnapshot, kDataConfigurationType
} from "../data-display/models/data-configuration-model"
import { MapComponent } from "./components/map-component"
import { MapInspector } from "./components/map-inspector"
import {kMapIdPrefix, kMapTileClass, kMapTileType, kV2MapType} from "./map-defs"
import {kDefaultMapHeight, kDefaultMapWidth, kMapPointLayerType, kMapPolygonLayerType} from "./map-types"
import { IMapBaseLayerModelSnapshot } from "./models/map-base-layer-model"
import { IMapPointLayerModelSnapshot } from "./models/map-point-layer-model"
import { IMapPolygonLayerModelSnapshot } from "./models/map-polygon-layer-model"
import {
  createMapContentModel, IMapModelContentSnapshot, isMapContentModel, MapContentModel
} from "./models/map-content-model"
import { MapFilterFormulaAdapter } from "./models/map-filter-formula-adapter"
import {
  boundaryAttributeFromDataSet, datasetHasBoundaryData, datasetHasLatLongData, latLongAttributesFromDataSet
} from "./utilities/map-utils"
import {v2MapImporter} from "./v2-map-importer"
import { v2MapExporter } from "./map-V2-exporter"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"

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

registerComponentHandler(kV2MapType, {
  create({ values }) {
    const { document } = appState
    const { center: _center, dataContext: _dataContext, legendAttributeName, zoom } = values as V2Map
    const dataContext = getDataSetByNameOrId(document, _dataContext)
    const legendAttributeId = legendAttributeName
      ? dataContext?.getAttributeByName(legendAttributeName)?.id : undefined
    const layers:
      Array<IMapBaseLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot> = []
    let layerIndex = 0
    getSharedDataSets(document).forEach(sharedDataSet => {
      const dataset = sharedDataSet.dataSet
      const metadata = getSharedCaseMetadataFromDataset(dataset)
      if (metadata) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const LayerTypes = [kMapPointLayerType, kMapPolygonLayerType] as const
        type LayerType = typeof LayerTypes[number]
        const addLayer = (_type: LayerType, _attributeDescriptions: AttributeDescriptionsMapSnapshot) => {
          layers.push({
            dataConfiguration: {
              _attributeDescriptions,
              dataset: dataset.id,
              metadata: metadata.id,
              type: kDataConfigurationType
            },
            layerIndex: layerIndex++,
            type: _type
          })
        }

        // Point Layer
        if (datasetHasLatLongData(dataset)) {
          const { latId, longId } = latLongAttributesFromDataSet(dataset)
          const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
            lat: { attributeID: latId },
            long: { attributeID: longId }
          }
          if (dataset.id === dataContext?.id && legendAttributeId) {
            _attributeDescriptions.legend = { attributeID: legendAttributeId }
          }
          addLayer(kMapPointLayerType, _attributeDescriptions)

        // Polygon Layer
        } else if (datasetHasBoundaryData(dataset)) {
          const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
            polygon: { attributeID: boundaryAttributeFromDataSet(dataset) }
          }
          addLayer(kMapPolygonLayerType, _attributeDescriptions)
        }
      }
    })

    const center = _center ? { lat: _center[0], lng: _center[1] } : undefined
    const content: SetRequired<IMapModelContentSnapshot, "type"> = {
      type: kMapTileType,
      center,
      layers,
      zoom
    }
    // If the center or zoom are specified, we need to prevent CODAP from automatically focusing the map
    const options = center || zoom != null ? { transitionComplete: true } : undefined

    return { content, options }
  },
  get(content) {
    if (isMapContentModel(content)) {
      return { dataContext: content.dataConfiguration?.dataset?.name }
    }
  }
})
