import {ITileModelSnapshotIn} from "../../models/tiles/tile-model"
import {typedId} from "../../utilities/js-utils"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import {isV2MapComponent, v3TypeFromV2TypeIndex} from "../../v2/codap-v2-types"
import {GraphAttrRole} from "../data-display/data-display-types"
import {IAttributeDescriptionSnapshot, kDataConfigurationType} from "../data-display/models/data-configuration-model"
import {IMapModelContentSnapshot} from "./models/map-content-model"
import {kMapIdPrefix, kMapTileType} from "./map-defs"
import {IMapPointLayerModelSnapshot} from "./models/map-point-layer-model"
import {BaseMapKey, kMapPointLayerType, kMapPolygonLayerType} from "./map-types"
import {IMapBaseLayerModelSnapshot} from "./models/map-base-layer-model"
import {IMapPolygonLayerModelSnapshot} from "./models/map-polygon-layer-model"

export function v2MapImporter({v2Component, v2Document, insertTile}: V2TileImportArgs) {
  if (!isV2MapComponent(v2Component)) return

  const {title = "", mapModelStorage} = v2Component.componentStorage
  const {center, zoom, baseMapLayerName: v2BaseMapLayerName, layerModels: v2LayerModels} = mapModelStorage
  const baseMapKeyMap: Record<string, BaseMapKey> = { Topographic: 'topo', Streets: 'streets', Oceans: 'oceans' }
  const baseMapLayerName = baseMapKeyMap[v2BaseMapLayerName]

  const layers: Array<IMapBaseLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot> = []

  v2LayerModels.forEach((v2LayerModel, layerIndex) => {
    // Pull out stuff from _links_ and decide if it's a point layer or polygon layer
    const contextId = v2LayerModel._links_.context.id,
      _attributeDescriptions: Partial<Record<GraphAttrRole, IAttributeDescriptionSnapshot>> = {},
      hiddenCases = v2LayerModel._links_.hiddenCases,
      // legendCollectionId = v2LayerModel._links_.legendColl?.id,
      v2LegendAttribute = Array.isArray(v2LayerModel._links_.legendAttr)
        ? v2LayerModel._links_.legendAttr[0] : v2LayerModel._links_.legendAttr,
      legendAttributeId = v2LegendAttribute?.id,
      legendAttribute = legendAttributeId ? v2Document.getV3Attribute(legendAttributeId) : undefined,
      v3LegendAttrId = legendAttribute?.id ?? '',
      isPoints = v2LayerModel.pointColor !== undefined,
      {data, metadata} = v2Document.getDataAndMetadata(contextId),
      {
        isVisible, legendAttributeType, strokeSameAsFill,
/*      Present in v2 layer model but not yet used in V3 layer model:
        legendRole
*/
      } = v2LayerModel,
      v3LegendType = v3TypeFromV2TypeIndex[legendAttributeType]

    if (legendAttributeId) {
      _attributeDescriptions.legend = {
        attributeID: v3LegendAttrId,
        type: v3LegendType
      }
    }

    if (isPoints) {
      const {
        pointColor, strokeColor, pointSizeMultiplier,
        /* Present in v2 layer model but not yet used in V3 layer model:
        transparency, strokeTransparency, pointsShouldBeVisible,
        grid, connectingLines,
        */
      } = v2LayerModel

      const pointLayerSnapshot: IMapPointLayerModelSnapshot = {
        type: kMapPointLayerType,
        layerIndex,
        dataConfiguration: {
          type: kDataConfigurationType,
          dataset: data?.dataSet.id,
          metadata: metadata?.id,
          _attributeDescriptions,
          hiddenCases,
        },
        isVisible,
        displayItemDescription: {
          _itemColors: pointColor ? [pointColor] : [],
          _itemStrokeColor: strokeColor,
          pointSizeMultiplier
        }
      }
      layers.push(pointLayerSnapshot)
    }
    else {
      const {
        areaColor, areaStrokeColor,
        /* Present in v2 layer model but not yet used in V3 layer model:
        areaTransparency, strokeTransparency, areaStrokeTransparency
        */
      } = v2LayerModel

      const polygonLayerSnapshot: IMapPolygonLayerModelSnapshot = {
        type: kMapPolygonLayerType,
        layerIndex,
        dataConfiguration: {
          type: kDataConfigurationType,
          dataset: data?.dataSet.id,
          metadata: metadata?.id,
          _attributeDescriptions
        },
        isVisible,
        displayItemDescription: {
          _itemColors: [areaColor || ''],
          _itemStrokeColor: areaStrokeColor,
          _itemStrokeSameAsFill: strokeSameAsFill,
/*
          areaTransparency,
          strokeTransparency,
          areaStrokeTransparency
*/
        }
      }
      layers.push(polygonLayerSnapshot)
    }
  })

  const content: IMapModelContentSnapshot = {
    type: kMapTileType,
    center, zoom, baseMapLayerName, baseMapLayerIsVisible: true, layers
  }

  const mapTileSnap: ITileModelSnapshotIn = { id: typedId(kMapIdPrefix), title, content }
  return insertTile(mapTileSnap)
}
