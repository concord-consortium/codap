/**
 * MapPolygonLayerModel keeps track of the state of the map polygon layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {GeoJSON} from "leaflet"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"
import {IMapLayerModel, MapLayerModel} from "./map-layer-model"
import {IDataSet} from "../../../models/data/data-set"
import {boundaryAttributeFromDataSet} from "../utilities/map-utils"
import {DataConfigurationModel} from "../../data-display/models/data-configuration-model"

export const kMapPolygonLayerType = "mapPolygonLayer"

export const MapPolygonLayerModel = MapLayerModel
  .named('MapPolygonLayerModel')
  .props({
    type: types.optional(types.literal(kMapPolygonLayerType), kMapPolygonLayerType),
    dataConfiguration: types.optional(DataConfigurationModel, () => DataConfigurationModel.create()),
  })
  .volatile(() => ({
    features: [] as GeoJSON[]
  }))
  .actions(self => ({
    setDataset(dataSet:IDataSet) {
      const boundaryId = boundaryAttributeFromDataSet(dataSet)
      self.dataConfiguration.setDataset(dataSet, getSharedCaseMetadataFromDataset(dataSet))
      self.dataConfiguration.setAttribute('polygon', {attributeID: boundaryId})
    }

  }))
  .views(self => ({
  }))

export interface IMapPolygonLayerModel extends Instance<typeof MapPolygonLayerModel> {}

export interface IMapPolygonLayerModelSnapshot extends SnapshotIn<typeof MapPolygonLayerModel> {}

export function isMapPolygonLayerModel(layerModel?: IMapLayerModel): layerModel is IMapPolygonLayerModel {
  return layerModel?.type === kMapPolygonLayerType
}

