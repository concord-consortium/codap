import {AttributeType} from "../../models/data/attribute"
import {TileModel} from "../../models/tiles/tile-model"
import {typedId} from "../../utilities/js-utils"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import {ICodapV2MapStorage, IGuidLink, isV2MapComponent} from "../../v2/codap-v2-types"
import {IAttributeDescriptionSnapshot} from "../data-display/models/data-configuration-model"
import {IMapContentModel, IMapModelContentSnapshot} from "./models/map-content-model"
import {kMapIdPrefix, kMapTileType} from "./map-defs"
import {IMapPointLayerModel} from "./models/map-point-layer-model";

export function v2MapImporter({v2Component, v2Document, sharedModelManager, insertTile}: V2TileImportArgs) {
  if (!isV2MapComponent(v2Component)) return

  const {title = "", mapModelStorage} = v2Component.componentStorage
  const {center, zoom, baseMapLayerName, layerModels} = mapModelStorage
  const _baseMapLayerName = baseMapLayerName === 'Topographic' ? 'topo'
    : baseMapLayerName === 'Streets' ? 'streets'
      : baseMapLayerName === 'Oceans' ? 'oceans'
        : undefined
  const content: IMapModelContentSnapshot = {
    type: kMapTileType,
    center, zoom, baseMapLayerName: _baseMapLayerName, baseMapLayerIsVisible: true, layers: []
  }
  const mapTile = TileModel.create({id: typedId(kMapIdPrefix), title, content}),
    mapContentModel = mapTile.content as IMapContentModel
  layerModels.forEach(v2LayerModel => {
    // Pull out stuff from _links_ and decide if it's a point layer or polygon layer
    const datasetId = v2LayerModel._links_.context.id,
      hiddenCases = v2LayerModel._links_.hiddenCases,
      legendCollectionId = v2LayerModel._links_.legendColl?.id,
      legendAttributeId = v2LayerModel._links_.legendAttr?.id,
      isPoints = v2LayerModel.pointColor !== undefined,
      {data, metadata} = v2Document.getDataAndMetadata(datasetId)
    if (isPoints) {
      const {
        pointColor, strokeColor, pointSizeMultiplier,
        transparency, strokeTransparency, pointsShouldBeVisible,
        grid, connectingLines,
      } = v2LayerModel
      const pointDescription = mapContentModel.addPointLayer(data.dataSet).pointDescription

    }
  })
  insertTile(mapTile)

  // link shared model
  // sharedModelManager?.addTileSharedModel(mapTile.content, data, true)
  // sharedModelManager?.addTileSharedModel(mapTile.content, metadata, true)

  return mapTile
}
