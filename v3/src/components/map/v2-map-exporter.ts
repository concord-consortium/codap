import { SetOptional } from "type-fest"
import { kPolygonNames } from "../../models/boundaries/boundary-types"
import { AttributeType } from "../../models/data/attribute-types"
import { toV2Id } from "../../utilities/codap-utils"
import { V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import {
  guidLink, ICodapV2BaseComponentStorage, ICodapV2MapLayerBaseStorage, ICodapV2MapLayerStorage,
  ICodapV2MapPointLayerStorage, ICodapV2MapPolygonLayerStorage, ICodapV2MapStorage
} from "../../v2/codap-v2-types"
import { IDataDisplayLayerModel } from "../data-display/models/data-display-layer-model"
import { BaseMapKey, kLatNames, kLongNames, kMapPointLayerType, kMapPolygonLayerType } from "./map-types"
import { isMapContentModel } from "./models/map-content-model"
import { IMapLayerModel } from "./models/map-layer-model"
import { IMapPointLayerModel } from "./models/map-point-layer-model"
import { IMapPolygonLayerModel } from "./models/map-polygon-layer-model"

function baseMapStringToV2BaseMapString(baseType: BaseMapKey) {
  switch (baseType) {
    case "oceans": return "Oceans"
    case "topo": return "Topographic"
    case "streets": return "Streets"
  }
}

function legendAttributeTypeToV2LegendAttributeType(legendAttributeType: AttributeType) {
  switch (legendAttributeType) {
    case "numeric": return 1
    case "categorical": return 2
    case "date": return 3
    case "boundary": return 4
    case "color": return 5
    default: return 0
  }
}

function maybeGuidLink(prop: string, type: string, id?: string) {
  return id ? { [prop]: guidLink(type, toV2Id(id)) } : undefined
}

function exportMapBaseLayerStorage(layer: IMapLayerModel): ICodapV2MapLayerBaseStorage {
  const { dataConfiguration, isVisible } = layer
  const dataset = dataConfiguration.dataset
  const {attributeDescriptions} = dataConfiguration
  const legendAttributeId = attributeDescriptions.legend?.attributeID
  const legendAttributeType = attributeDescriptions.legend?.type
                                ? legendAttributeTypeToV2LegendAttributeType(attributeDescriptions.legend?.type)
                                : 0
  const legendCollection = legendAttributeId && dataset
            ? dataset.getCollectionForAttribute(legendAttributeId) : undefined
  return {
    _links_: {
      // shouldn't ever get here without a dataset
      context: guidLink("DG.DataContextRecord", toV2Id(dataset?.id ?? "undefined")),
      hiddenCases: dataConfiguration.hiddenCases.map(hiddenCase => guidLink("DG.Case", toV2Id(hiddenCase))),
      ...maybeGuidLink("legendColl", "DG.Collection", legendCollection?.id),
      ...maybeGuidLink("legendAttr", "DG.Attribute", attributeDescriptions.legend?.attributeID),
    },
    isVisible: isVisible ?? false,
    legendRole: 0,
    legendAttributeType
  }
}

export const v2MapExporter: V2TileExportFn = ({ tile }) => {
  const mapContent = isMapContentModel(tile.content) ? tile.content : undefined
  const dataSetsArray = mapContent?.datasetsArray

  if (!mapContent) return undefined

  // find the layer from mapContent that matches the type and the dataset.id
  const findLayerFromContent = <T extends IDataDisplayLayerModel>(contextId: string, layerType: string) => {
    return mapContent.layers.find(layer => layer.type === layerType &&
                                        layer.dataConfiguration.dataset?.id === contextId) as Maybe<T>
  }

  // V2 creates a layer model for each collection in each dataset, and then adds state to the layer model from storage.
  // This may create an index mismatch between V3 storage and V2 map layer model array.
  // So we create the array of layer models based on the data sets and collections to try to mimic the V2 array order.
  // for each dataset in datasetsArray, go through each collection and
  // add a layer model for each that is a [kLatNames, kLongNames], or kPolygonNames
  // then add the state of the layer from the modelContent to the layer model
  const v2LayerModels: Array<ICodapV2MapLayerStorage> = []
  const v2LayerModelIds: Array<string> = []
  dataSetsArray?.forEach((dataSet) => {
    dataSet.collections.forEach((collection) => {
      const latAttribute = collection.attributes.find(attr => attr && kLatNames.includes(attr.name.toLowerCase()))
      const longAttribute = collection.attributes.find(attr => attr && kLongNames.includes(attr.name.toLowerCase()))
      const polygonAttribute = collection.attributes
                                .find(attr => attr && kPolygonNames.includes(attr.name.toLowerCase()))

      if (latAttribute && longAttribute) {
        const pointLayerModel = findLayerFromContent<IMapPointLayerModel>(dataSet.id, kMapPointLayerType)
        if (pointLayerModel && !v2LayerModelIds.includes(pointLayerModel.id)) {
          const {displayItemDescription, gridModel, pointsAreVisible, connectingLinesAreVisible} = pointLayerModel
          const {itemColor, itemStrokeColor, pointSizeMultiplier} = displayItemDescription
          const pointLayer: ICodapV2MapPointLayerStorage = {
            ...exportMapBaseLayerStorage(pointLayerModel),
            pointColor: itemColor ?? "",
            strokeColor: itemStrokeColor ?? "",
            pointSizeMultiplier: pointSizeMultiplier ?? 1,
            // TODO_V2_EXPORT: transparency and strokeTransparency
            transparency: 1,
            strokeTransparency: 1,
            pointsShouldBeVisible: pointsAreVisible ?? false,
            grid: {
              gridMultiplier: gridModel.gridMultiplier ?? 1,
              isVisible: gridModel.isVisible ?? false,
            },
            connectingLines: {
              isVisible: connectingLinesAreVisible ?? false,
              // TODO_V2_EXPORT: enableMeasuresForSelection
              enableMeasuresForSelection: false
            }
            // TODO_V2_EXPORT: linesShouldBeVisible
          }
          v2LayerModelIds.push(pointLayerModel.id)
          v2LayerModels.push(pointLayer)
        }
      }
      // collection can have both lat/long and polygon attributes
      if (polygonAttribute) {
        const polygonLayerModel = findLayerFromContent<IMapPolygonLayerModel>(dataSet.id, kMapPolygonLayerType)
        if (polygonLayerModel && !v2LayerModelIds.includes(polygonLayerModel.id)) {
          const {polygonDescription} = polygonLayerModel
          const polygonLayer: ICodapV2MapPolygonLayerStorage = {
            ...exportMapBaseLayerStorage(polygonLayerModel),
            areaColor: polygonDescription._itemColors[0] ?? "",
            // TODO_V2_EXPORT: areaTransparency
            areaTransparency: 1,
            areaStrokeColor: polygonDescription.itemStrokeColor ?? "",
            // TODO_V2_EXPORT: areaStrokeTransparency
            areaStrokeTransparency: 1,
            strokeSameAsFill: polygonDescription.itemStrokeSameAsFill ?? false
          }
          v2LayerModelIds.push(polygonLayerModel.id)
          v2LayerModels.push(polygonLayer)
        }
      }
    })
  })

  const componentStorage: Maybe<SetOptional<ICodapV2MapStorage, keyof ICodapV2BaseComponentStorage>> = {
    mapModelStorage: {
      center: mapContent.center,
      zoom: mapContent.zoom,
      baseMapLayerName: baseMapStringToV2BaseMapString(mapContent.baseMapLayerName) || "Topographic",
      // TODO_V2_EXPORT: gridMultiplier
      gridMultiplier: 1,
      layerModels: v2LayerModels
    }
  }

  return { type: "DG.MapView", componentStorage }
}
