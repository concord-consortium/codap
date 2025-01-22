import { SetOptional } from "type-fest"
import { isMapContentModel } from "./models/map-content-model"
import { kLatNames, kLongNames, kMapPointLayerType, kMapPolygonLayerType } from "./map-types"
import { V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import { baseMapStringToV2BaseMapString, guidLink, ICodapV2BaseComponentStorage,
          ICodapV2MapLayerStorage, ICodapV2MapPointLayerStorage, ICodapV2MapPolygonLayerStorage,
          ICodapV2MapStorage, legendAttributeTypeToV2LegendAttributeType } from "../../v2/codap-v2-types"
import { toV2Id } from "../../utilities/codap-utils"
import { kPolygonNames } from "../../models/boundaries/boundary-types"
import { IMapPointLayerModel } from "./models/map-point-layer-model"
import { IMapPolygonLayerModel } from "./models/map-polygon-layer-model"

export const v2MapExporter: V2TileExportFn = ({ tile }) => {
  const { name, title, content } = tile
  const mapContent = isMapContentModel(content) ? content : undefined
  const dataSetsArray = mapContent?.datasetsArray

  if (!mapContent) return undefined

  //find the layer from mapContent that matches the type and the dataset.id
  const findLayerFromContent = (contextId: string, layerType: any) => {
    return mapContent.layers.find(layer => layer.type === layerType &&
                                        layer.dataConfiguration.dataset?.id === contextId)
  }

  // V2 creates a layer model for each collection in each dataset, and then adds state to the layer model from storage
  // This may create an index mismatch between V3 storage and V2 map layer model array.
  // So we create the array of layer models based on the data sets and collections to try to mimic the V2 array order
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
        const pointLayerModel = findLayerFromContent(dataSet.id, kMapPointLayerType) as IMapPointLayerModel
          if (pointLayerModel && !v2LayerModelIds.includes(pointLayerModel.id)) {
          const dataConfiguration = pointLayerModel?.dataConfiguration
          const {attributeDescriptions, dataset: layerDataset } = dataConfiguration
          const legendAttributeId = attributeDescriptions.legend?.attributeID
          const legendAttributeType = attributeDescriptions.legend?.type
                                    ? legendAttributeTypeToV2LegendAttributeType(attributeDescriptions.legend?.type)
                                    : 0
          const legendCollection = legendAttributeId && layerDataset
                ? layerDataset.getCollectionForAttribute(legendAttributeId) : undefined
          const {displayItemDescription, gridModel, pointsAreVisible, connectingLinesAreVisible} = pointLayerModel
          const {itemColor, itemStrokeColor, pointSizeMultiplier} = displayItemDescription
          const pointLayer: ICodapV2MapPointLayerStorage = {
            pointColor: itemColor || "",
            strokeColor: itemStrokeColor || "",
            pointSizeMultiplier: pointSizeMultiplier || 1,
            transparency: 1,
            strokeTransparency: 1,
            pointsShouldBeVisible: pointsAreVisible || false,
            grid: {
              gridMultiplier: gridModel.gridMultiplier || 1,
              isVisible: gridModel.isVisible || false,
            },
            connectingLines: {
              isVisible: connectingLinesAreVisible || false,
              enableMeasuresForSelection: false
            },
            legendRole: 0,
            legendAttributeType,
            isVisible: true,
            _links_: {
              context: guidLink("DG.DataContextRecord", toV2Id(layerDataset?.id ?? dataSet.id)),
              hiddenCases: dataConfiguration?.hiddenCases.map(hiddenCase =>
                                  {return guidLink("DG.Case", toV2Id(hiddenCase))}),
              legendColl: legendCollection ? guidLink("DG.Collection", toV2Id(legendCollection.id)) : undefined,
              legendAttr: attributeDescriptions.legend?.attributeID
                ? guidLink("DG.Attribute", toV2Id(attributeDescriptions.legend?.attributeID)) : undefined,
            }
          }
          v2LayerModelIds.push(pointLayerModel.id)
          pointLayer && v2LayerModels.push(pointLayer)
        }
      } else if (polygonAttribute) {
        const polygonLayerModel = findLayerFromContent(dataSet.id, kMapPolygonLayerType) as IMapPolygonLayerModel
        if (polygonLayerModel && !v2LayerModelIds.includes(polygonLayerModel.id)) {
          const dataConfiguration = polygonLayerModel?.dataConfiguration
          const {attributeDescriptions, dataset: layerDataset } = dataConfiguration
          const {isVisible, polygonDescription} = polygonLayerModel
          const legendAttributeId = attributeDescriptions.legend?.attributeID
          const legendAttributeType = attributeDescriptions.legend?.type
                                    ? legendAttributeTypeToV2LegendAttributeType(attributeDescriptions.legend?.type)
                                    : 0
          const legendCollection = legendAttributeId && layerDataset
                ? layerDataset.getCollectionForAttribute(legendAttributeId) : undefined

          const polygonLayer: ICodapV2MapPolygonLayerStorage = {
            isVisible: isVisible || false,
            areaColor: polygonDescription._itemColors[0] || "",
            areaTransparency: 1,
            areaStrokeColor: polygonDescription.itemStrokeColor || "",
            areaStrokeTransparency: 1,
            strokeSameAsFill: polygonDescription.itemStrokeSameAsFill || false,
            legendRole: 0,
            legendAttributeType,
            _links_: {
              context: guidLink("DG.DataContextRecord", toV2Id(layerDataset?.id ?? dataSet.id)),
              hiddenCases: dataConfiguration.hiddenCases.map(hiddenCase =>
                                  {return guidLink("DG.Case", toV2Id(hiddenCase))}),
              legendColl: legendCollection ? guidLink("DG.Collection", toV2Id(legendCollection.id)) : undefined,
              legendAttr: attributeDescriptions.legend?.attributeID
                ? guidLink("DG.Attribute", toV2Id(attributeDescriptions.legend?.attributeID)) : undefined,
            },
          }
          v2LayerModelIds.push(polygonLayerModel.id)
          v2LayerModels.push(polygonLayer)
        }
      }
    })
  })

  const componentStorage: Maybe<SetOptional<ICodapV2MapStorage, keyof ICodapV2BaseComponentStorage>> = {
    name,
    title,
    mapModelStorage: {
      center: mapContent.center,
      zoom: mapContent.zoom,
      baseMapLayerName: baseMapStringToV2BaseMapString(mapContent.baseMapLayerName) || "Topographic",
      gridMultiplier: 1,
      layerModels: v2LayerModels,
    },
  }

  return { type: "DG.MapView", componentStorage }
}
