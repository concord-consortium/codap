import { SetOptional } from "type-fest"
import { isMapContentModel } from "./models/map-content-model"
import { kMapPointLayerType, kMapPolygonLayerType } from "./map-types"
import { V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import { baseMapStringToV2BaseMapString, guidLink, ICodapV2BaseComponentStorage,
          ICodapV2MapLayerStorage, ICodapV2MapPointLayerStorage,ICodapV2MapPolygonLayerStorage,
          ICodapV2MapStorage, legendAttributeTypeToV2LegendAttributeType} from "../../v2/codap-v2-types"
import { toV2Id } from "../../utilities/codap-utils"

export const v2MapExporter: V2TileExportFn = ({ tile }) => {
  const { name, _title, content } = tile
  const mapContent = isMapContentModel(content) ? content : undefined

  if (!mapContent) return
  const v2LayerModels: Array<ICodapV2MapLayerStorage> = []

  mapContent.layers.forEach((layer) => {
    const dataConfiguration = layer.dataConfiguration
    const dataset = dataConfiguration.dataset
    const {attributeDescriptions} = dataConfiguration
    const legendAttributeId = attributeDescriptions.legend?.attributeID
    const legendAttributeType = attributeDescriptions.legend?.type
                                  ? legendAttributeTypeToV2LegendAttributeType(attributeDescriptions.legend?.type)
                                  : 0
    const legendCollection = legendAttributeId && dataset
              ? dataset.getCollectionForAttribute(legendAttributeId) : undefined
              
    if (dataset) {
      if (layer.type === kMapPointLayerType) {
        const {displayItemDescription, gridModel, pointsAreVisible, connectingLinesAreVisible} = layer
        const {itemColor, itemStrokeColor, pointSizeMultiplier} = displayItemDescription

        const pointLayerModel: ICodapV2MapPointLayerStorage = {
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
            context: guidLink("DG.DataContextRecord", toV2Id(dataset.id)),
            hiddenCases: dataConfiguration.hiddenCases.map(hiddenCase =>
                                {return guidLink("DG.Case", toV2Id(hiddenCase))}),
            legendColl: legendCollection ? guidLink("DG.Collection", toV2Id(legendCollection.id)) : undefined,
            legendAttr: attributeDescriptions.legend?.attributeID
              ? guidLink("DG.Attribute", toV2Id(attributeDescriptions.legend?.attributeID)) : undefined,
          },
        }
        v2LayerModels.push(pointLayerModel)
      } else if (layer.type === kMapPolygonLayerType) {
        const {isVisible, polygonDescription} = layer

        const polygonLayerModel: ICodapV2MapPolygonLayerStorage = {
          isVisible: isVisible || false,
          areaColor: polygonDescription._itemColors[0] || "",
          areaTransparency: 1,
          areaStrokeColor: polygonDescription.itemStrokeColor || "",
          areaStrokeTransparency: 1,
          strokeSameAsFill: polygonDescription.itemStrokeSameAsFill || false,
          legendRole: 0,
          legendAttributeType,
          _links_: {
            context: guidLink("DG.DataContextRecord", toV2Id(dataset.id)),
            hiddenCases: dataConfiguration.hiddenCases.map(hiddenCase =>
                                {return guidLink("DG.Case", toV2Id(hiddenCase))}),
            legendColl: legendCollection ? guidLink("DG.Collection", toV2Id(legendCollection.id)) : undefined,
            legendAttr: attributeDescriptions.legend?.attributeID
              ? guidLink("DG.Attribute", toV2Id(attributeDescriptions.legend?.attributeID)) : undefined,
          },
        }
        v2LayerModels.push(polygonLayerModel)
      }
    }
  })

  const componentStorage: Maybe<SetOptional<ICodapV2MapStorage, keyof ICodapV2BaseComponentStorage>> = {
    name,
    title: _title,
    mapModelStorage: {
      center: mapContent.center,
      zoom: mapContent.zoom,
      baseMapLayerName: baseMapStringToV2BaseMapString(mapContent.baseMapLayerName),
      gridMultiplier: 1,
      layerModels: v2LayerModels,
    },
  }

  return { type: "DG.MapView", componentStorage }
}
