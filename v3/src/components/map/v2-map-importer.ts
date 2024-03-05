import {AttributeType} from "../../models/data/attribute"
import {ITileModelSnapshotIn, TileModel} from "../../models/tiles/tile-model"
import {typedId} from "../../utilities/js-utils"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import {ICodapV2MapStorage, IGuidLink, isV2MapComponent} from "../../v2/codap-v2-types"
import {IAttributeDescriptionSnapshot, kDataConfigurationType} from "../data-display/models/data-configuration-model"
import {IMapContentModel, IMapModelContentSnapshot} from "./models/map-content-model"
import {kMapIdPrefix, kMapTileType} from "./map-defs"
import {IMapPointLayerModel, IMapPointLayerModelSnapshot} from "./models/map-point-layer-model"
import { BaseMapKey, kMapPointLayerType } from "./map-types"
import { IMapBaseLayerModelSnapshot } from "./models/map-base-layer-model"
import { IMapPolygonLayerModelSnapshot } from "./models/map-polygon-layer-model"

export function v2MapImporter({v2Component, v2Document, sharedModelManager, insertTile}: V2TileImportArgs) {
  if (!isV2MapComponent(v2Component)) return

  const {title = "", mapModelStorage} = v2Component.componentStorage
  const {center, zoom, baseMapLayerName: v2BaseMapLayerName, layerModels: v2LayerModels} = mapModelStorage
  const baseMapKeyMap: Record<string, BaseMapKey> = { Topographic: 'topo', Streets: 'streets', Oceans: 'oceans' }
  const baseMapLayerName = baseMapKeyMap[v2BaseMapLayerName]

  const layers: Array<IMapBaseLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot> = []

  v2LayerModels.forEach(v2LayerModel => {
    // Pull out stuff from _links_ and decide if it's a point layer or polygon layer
    const contextId = v2LayerModel._links_.context.id,
      hiddenCases = v2LayerModel._links_.hiddenCases,
      legendCollectionId = v2LayerModel._links_.legendColl?.id,
      legendAttributeId = v2LayerModel._links_.legendAttr?.id,
      isPoints = v2LayerModel.pointColor !== undefined,
      {data, metadata} = v2Document.getDataAndMetadata(contextId)
    if (isPoints) {
      const {
        pointColor, strokeColor, pointSizeMultiplier,
        transparency, strokeTransparency, pointsShouldBeVisible,
        grid, connectingLines,
      } = v2LayerModel

      const layerSnapshot: IMapPointLayerModelSnapshot = {
        type: kMapPointLayerType,
        dataConfiguration: {
          type: kDataConfigurationType,
          dataset: data?.dataSet.id,
          metadata: metadata?.id
        },
        isVisible: pointsShouldBeVisible ?? true,
        displayItemDescription: {
          _itemColors: pointColor ? [pointColor] : [],
          _itemStrokeColor: strokeColor,
          pointSizeMultiplier
        }
      }
      layers.push(layerSnapshot)
    }
  })

  const content: IMapModelContentSnapshot = {
    type: kMapTileType,
    center, zoom, baseMapLayerName, baseMapLayerIsVisible: true, layers
  }

  const mapTileSnap: ITileModelSnapshotIn = { id: typedId(kMapIdPrefix), title, content }
  const mapTile = insertTile(mapTileSnap)

  return mapTile
}
