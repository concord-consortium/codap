/**
 * MapPointLayerModel keeps track of the state of the map points layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {MapLayerModel} from "./map-layer-model"
import {DataConfigurationModel} from "../../data-display/models/data-configuration-model"
import {PointDescriptionModel} from "../../data-display/models/point-description-model"
import {computePointRadius} from "../../data-display/data-display-utils"

export const kMapPointLayerType = "mapPointLayer"

export const MapPointLayerModel = MapLayerModel
  .named('MapPointLayerModel')
  .props({
    type: types.optional(types.literal(kMapPointLayerType), kMapPointLayerType),
    dataConfiguration: types.optional(DataConfigurationModel, () => DataConfigurationModel.create()),
    pointDescription: types.optional(PointDescriptionModel, () => PointDescriptionModel.create()),
  })
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.caseDataArray.length,
        self.pointDescription.pointSizeMultiplier, use)
    },
  }))


export interface IMapPointLayerModel extends Instance<typeof MapPointLayerModel> {
}

export interface IMapPointLayerModelSnapshot extends SnapshotIn<typeof MapPointLayerModel> {
}
