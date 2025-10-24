import { colord } from "colord"
import { SetOptional } from "type-fest"
import { toJS } from "mobx"
import { kPolygonNames } from "../../models/boundaries/boundary-types"
import { AttributeType } from "../../models/data/attribute-types"
import { toV2Id } from "../../utilities/codap-utils"
import { removeAlphaFromColor } from "../../utilities/color-utils"
import { V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import {
  guidLink, ICodapV2BaseComponentStorage, ICodapV2MapLayerBaseStorage, ICodapV2MapLayerStorage,
  ICodapV2MapPointLayerStorage, ICodapV2MapPolygonLayerStorage, ICodapV2MapStorage
} from "../../v2/codap-v2-types"
import { exportV3Properties } from "../../v2/codap-v2-type-utils"
import { IDataDisplayLayerModel } from "../data-display/models/data-display-layer-model"
import { BaseMapKey, kLatNames, kLongNames, kMapPointLayerType, kMapPolygonLayerType } from "./map-types"
import { isMapContentModel } from "./models/map-content-model"
import { IMapLayerModel } from "./models/map-layer-model"
import { IMapPointLayerModel } from "./models/map-point-layer-model"
import { IMapPolygonLayerModel } from "./models/map-polygon-layer-model"

// These two constants are just for testing.
// V2 serializes these default values as strings, though it can clearly
// handle numeric values for these properties. In fact changing the values of these properties
// in V2 assigns numeric values.
const kV2DefaultAreaTransparency = 0.5
const kV2DefaultAreaStrokeTransparency = 0.6

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
    legendAttributeType,
    numberOfLegendQuantiles: dataConfiguration.numberOfLegendQuantiles ?? 0,
    legendQuantilesAreLocked: dataConfiguration.legendQuantilesAreLocked ?? false,
    legendQuantiles: dataConfiguration.legendQuantiles ?? [],
    ...exportV3Properties(dataConfiguration)
  }
}

const getTransparency = (color: string) => {
  const rgbaColor = colord(color).toRgb()
  //returns 1 if alpha channel or color is empty string
  return rgbaColor.a
}

// v2 uses color names for default stroke colors
const strokeColorStr = (color: string) => {
  const colorHex = removeAlphaFromColor(color).toLowerCase()
  return colorHex === "#ffffff" ? "white"
            : colorHex === "#d3d3d3" ? "lightgrey"
            : colorHex
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
  const gridMultiplierArr: number[] = []

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
          const {itemColor, itemStrokeColor, pointSizeMultiplier, itemStrokeSameAsFill} = displayItemDescription
          gridMultiplierArr.push(gridModel.gridMultiplier)
          const pointLayer: ICodapV2MapPointLayerStorage = {
            ...exportMapBaseLayerStorage(pointLayerModel),
            pointColor: removeAlphaFromColor(itemColor) ?? "",
            strokeColor: itemStrokeSameAsFill
                          ? "white" // v2 uses white for stroke when stroke is same as fill
                          : strokeColorStr(itemStrokeColor) ?? "",
            pointSizeMultiplier: pointSizeMultiplier ?? 1,
            transparency: getTransparency(itemColor),
            strokeTransparency: itemStrokeSameAsFill ? 0.4 : getTransparency(itemStrokeColor),
            strokeSameAsFill: itemStrokeSameAsFill,
            pointsShouldBeVisible: pointsAreVisible ?? false,
            grid: {
              gridMultiplier: gridModel.gridMultiplier ?? 1,
              isVisible: gridModel.isVisible ?? false,
            },
            connectingLines: {
              isVisible: connectingLinesAreVisible ?? false,
              enableMeasuresForSelection: false
            }
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
          const areaTransparency =  getTransparency(polygonDescription._itemColors[0] ?? "")
          const areaStrokeTransparency = getTransparency(polygonDescription.itemStrokeColor ?? "")
          const polygonLayer: ICodapV2MapPolygonLayerStorage = {
            ...exportMapBaseLayerStorage(polygonLayerModel),
            areaColor: removeAlphaFromColor(polygonDescription._itemColors[0]) ?? "",
            areaTransparency: areaTransparency === kV2DefaultAreaTransparency
                                ? `${kV2DefaultAreaTransparency}` : areaTransparency,
            areaStrokeColor: polygonDescription.itemStrokeSameAsFill
                              ? "white" // v2 uses white for stroke when stroke is same as fill
                              : strokeColorStr(polygonDescription.itemStrokeColor) ?? "",
            areaStrokeTransparency: polygonDescription.itemStrokeSameAsFill ||
                                      areaStrokeTransparency === kV2DefaultAreaStrokeTransparency
                                        ? `${kV2DefaultAreaStrokeTransparency}` : areaStrokeTransparency,
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
      center: toJS(mapContent.center),  // without toJS, the center is a MobX observable
      zoom: toJS(mapContent.zoom),
      baseMapLayerName: baseMapStringToV2BaseMapString(mapContent.baseMapLayerName) || "Topographic",
      gridMultiplier: Math.min(...gridMultiplierArr) ?? 1,
      layerModels: v2LayerModels
    }
  }

  return { type: "DG.MapView", componentStorage }
}
