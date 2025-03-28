import {ITileModelSnapshotIn} from "../../models/tiles/tile-model"
import {toV3Id} from "../../utilities/codap-utils"
import { parseColorToHex } from "../../utilities/color-utils"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import {
  isV2MapComponent, isV2MapCurrentStorage, isV2MapPointLayerStorage, isV2MapPolygonLayerStorage
} from "../../v2/codap-v2-types"
import {v3TypeFromV2TypeIndex} from "../../v2/codap-v2-data-set-types"
import {AttrRole} from "../data-display/data-display-types"
import {IAttributeDescriptionSnapshot, kDataConfigurationType} from "../data-display/models/data-configuration-model"
import {IMapModelContentSnapshot} from "./models/map-content-model"
import {kMapIdPrefix, kMapTileType} from "./map-defs"
import {boundaryAttributeFromDataSet, latLongAttributesFromDataSet} from "./utilities/map-utils"
import {IMapPointLayerModelSnapshot} from "./models/map-point-layer-model"
import {BaseMapKey, kMapPointLayerType, kMapPolygonLayerType} from "./map-types"
import {IMapBaseLayerModelSnapshot} from "./models/map-base-layer-model"
import {IMapPolygonLayerModelSnapshot} from "./models/map-polygon-layer-model"


export function v2MapImporter({v2Component, v2Document, insertTile}: V2TileImportArgs) {
  if (!isV2MapComponent(v2Component)) return

  const { guid, componentStorage: { name, title = "", mapModelStorage, cannotClose } } = v2Component
  const { center, zoom, baseMapLayerName: v2BaseMapLayerName } = mapModelStorage
  const baseMapKeyMap: Record<string, BaseMapKey> = { Topographic: 'topo', Streets: 'streets', Oceans: 'oceans' }
  const baseMapLayerName = baseMapKeyMap[v2BaseMapLayerName]

  const layers: Array<IMapBaseLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot> = []

  // Note that v2 associates layers with collections automatically, rather than based on what is imported/restored.
  // The imported/restored contents just modify the display properties of the pre-assigned layers, rather than
  // determining the structure of the layers as this code implies.

  const v2LayerModels = isV2MapCurrentStorage(v2Component.componentStorage)
                          ? v2Component.componentStorage.mapModelStorage.layerModels
                          : []
  v2LayerModels?.forEach((v2LayerModel, layerIndex) => {
    // Pull out stuff from _links_ and decide if it's a point layer or polygon layer
    const contextId = v2LayerModel._links_.context.id,
      _attributeDescriptions: Partial<Record<AttrRole, IAttributeDescriptionSnapshot>> = {},
      // hiddenCases = v2LayerModel._links_.hiddenCases,
      // legendCollectionId = v2LayerModel._links_.legendColl?.id,
      v2LegendAttribute = Array.isArray(v2LayerModel._links_.legendAttr)
        ? v2LayerModel._links_.legendAttr[0] : v2LayerModel._links_.legendAttr,
      legendAttributeId = v2LegendAttribute?.id,
      legendAttribute = legendAttributeId ? v2Document.getV3Attribute(legendAttributeId) : undefined,
      v3LegendAttrId = legendAttribute?.id ?? '',
      {data, metadata} = v2Document.getDataAndMetadata(contextId),
      {
        isVisible, legendAttributeType, strokeSameAsFill,
/*      Present in v2 layer model but not yet used in V3 layer model:
        legendRole
*/
      } = v2LayerModel,
      v3LegendType = v3TypeFromV2TypeIndex[legendAttributeType]
    if (!data?.dataSet) return

    if (legendAttributeId) {
      _attributeDescriptions.legend = {
        attributeID: v3LegendAttrId,
        type: v3LegendType
      }
    }

    if (isV2MapPointLayerStorage(v2LayerModel)) {
      const {
        pointColor, strokeColor, pointSizeMultiplier,
        grid, pointsShouldBeVisible, connectingLines, transparency, strokeTransparency,
      } = v2LayerModel
      // V2 point layers don't store their lat/long attributes, so we need to find them in the dataset
      const {latId, longId} = latLongAttributesFromDataSet(data.dataSet)
      _attributeDescriptions.lat = {attributeID: latId, type: 'numeric'}
      _attributeDescriptions.long = {attributeID: longId, type: 'numeric'}

      const pointLayerSnapshot: IMapPointLayerModelSnapshot = {
        type: kMapPointLayerType,
        layerIndex,
        dataConfiguration: {
          type: kDataConfigurationType,
          dataset: data?.dataSet.id,
          metadata: metadata?.id,
          _attributeDescriptions,
          // TODO_V2_IMPORT [Story: #188694826] hiddenCases are not imported
          // the array in a "modern" v2 document coming from `mapModelStorage.layerModels[]._links_.hiddenCases`
          // looks like { type: "DG.Case", id: number }
          // The MST type expects an array of strings.
          // There are 296 instances where this is a non-empty array in cfm-shared
          // hiddenCases,
        },
        isVisible,
        displayItemDescription: {
          _itemColors: pointColor ? [parseColorToHex(pointColor, {colorNames: true, alpha: transparency})] : [],
          _itemStrokeColor: strokeColor ? parseColorToHex(strokeColor, {colorNames: true, alpha: strokeTransparency})
          : strokeColor,
          _pointSizeMultiplier: pointSizeMultiplier,
          _itemStrokeSameAsFill: strokeSameAsFill
        },
        gridModel: {
          isVisible: grid.isVisible,
          _gridMultiplier: grid.gridMultiplier,
        },
        pointsAreVisible: pointsShouldBeVisible,
        connectingLinesAreVisible: connectingLines.isVisible
      }
      layers.push(pointLayerSnapshot)
    }
    else if (isV2MapPolygonLayerStorage(v2LayerModel)) {
      const {
        areaColor, areaStrokeColor, areaTransparency, areaStrokeTransparency
      } = v2LayerModel
      // V2 polygon layers don't store their boundary attribute, so we need to find it in the dataset
      _attributeDescriptions.polygon = {attributeID: boundaryAttributeFromDataSet(data.dataSet)}
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
          _itemColors: areaColor
                          ? [parseColorToHex(areaColor,
                                              {colorNames: true, alpha: Number(areaTransparency)})]
                          : [areaColor],
          _itemStrokeColor: areaStrokeColor
                              ? parseColorToHex(areaStrokeColor,
                                                {colorNames: true, alpha: Number(areaStrokeTransparency)})
                              : areaStrokeColor,
          _itemStrokeSameAsFill: strokeSameAsFill,
        }
      }
      layers.push(polygonLayerSnapshot)
    }
  })

  const content: IMapModelContentSnapshot = {
    type: kMapTileType,
    center, zoom, baseMapLayerName, baseMapLayerIsVisible: true, layers
  }

  const mapTileSnap: ITileModelSnapshotIn =
          { id: toV3Id(kMapIdPrefix, guid), name, _title: title, content, cannotClose: cannotClose ?? false }
  return insertTile(mapTileSnap)
}
