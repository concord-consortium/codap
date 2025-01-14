import { SetOptional } from "type-fest"
import { isMapContentModel } from "./models/map-content-model"
import { kMapPointLayerType, kMapPolygonLayerType } from "./map-types"
import { V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import { ICodapV2BaseComponentStorage, ICodapV2MapLayerStorage,
          ICodapV2MapPointLayerStorage, ICodapV2MapPolygonLayerStorage, ICodapV2MapStorage, IGuidLink } from "../../v2/codap-v2-types"
import { boundaryAttributeFromDataSet } from "./utilities/map-utils"

export const v2MapExporter: V2TileExportFn = ({ tile }) => {
  const { id, name, _title, content } = tile
  const mapContent = isMapContentModel(content) ? content : undefined

  if (!mapContent) return
  const v2ComponentId = id
  const v2LayerModels: Array<ICodapV2MapLayerStorage> = []

  mapContent.layers.forEach((layer) => {
    if (layer.type === kMapPointLayerType) {
      const {dataConfiguration, displayItemDescription, gridModel, pointsAreVisible, connectingLinesAreVisible} = layer
      const {pointColor, pointStrokeColor, pointSizeMultiplier} = displayItemDescription
      const {dataset, attributeDescriptions} = dataConfiguration

      const pointLayerModel: ICodapV2MapPointLayerStorage = {
        pointColor: pointColor || "",
        strokeColor: pointStrokeColor || "",
        pointSizeMultiplier: pointSizeMultiplier || 1,
        pointsShouldBeVisible: pointsAreVisible || false,
        transparency: 1,
        strokeTransparency: 1,
        legendRole: 0, // assuming 0 is the appropriate number for "none"
        legendAttributeType: 0, // assuming 0 is the appropriate number for "none"
        isVisible: true,
        grid: {
          isVisible: gridModel.isVisible || false,
          gridMultiplier: gridModel.gridMultiplier || 1,
        },
        connectingLines: {
          isVisible: connectingLinesAreVisible || false,
        },
        _links_: {
          context: {
            id: Number(dataset?.id) || 0,
            type: "DG.DataContextRecord"
          },
          legendAttr: attributeDescriptions.legend as unknown as IGuidLink<"DG.Attribute"> || undefined,
        },
      }
      v2LayerModels.push(pointLayerModel)
    } else if (layer.type === kMapPolygonLayerType) {
      const {
        dataConfiguration,
        isVisible,
        displayItemDescription
      } = layer

      const dataset = dataConfiguration.dataset
      const boundaryAttribute = dataset ? boundaryAttributeFromDataSet(dataset) : ""

      const polygonLayerModel: ICodapV2MapPolygonLayerStorage = {
        isVisible: isVisible || false,
        areaColor: displayItemDescription.itemColor || "",
        areaTransparency: 1,
        areaStrokeColor: displayItemDescription.itemStrokeColor || "",
        areaStrokeTransparency: 1,
        strokeSameAsFill: displayItemDescription.itemStrokeSameAsFill || false,
        legendRole: 0, // assuming 0 is the appropriate number for "none"
        legendAttributeType: 0, // assuming 0 is the appropriate number for "none"

        _links_: {
          context: {
            id: Number(dataset?.id) || 0,
            type: "DG.DataContextRecord"
          },
          legendAttr: dataConfiguration.attributeDescriptions.legend as unknown as IGuidLink<"DG.Attribute"> ||
                        undefined,
        },
      }
      v2LayerModels.push(polygonLayerModel)
    }
  })

  const componentStorage: Maybe<SetOptional<ICodapV2MapStorage, keyof ICodapV2BaseComponentStorage>> = {
  // componentStorage  = {
    // guid: v2ComponentId,
    // type: "map",
    // componentStorage: {
      name,
      title: _title,
      mapModelStorage: {
        center: mapContent.center,
        zoom: mapContent.zoom,
        gridMultiplier: 1,
        baseMapLayerName: mapContent.baseMapLayerName,
        layerModels: v2LayerModels,
      },
    // },
  }

  return { type: "DG.MapView", componentStorage }
}
