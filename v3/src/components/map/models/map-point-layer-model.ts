/**
 * MapPointLayerModel keeps track of the state of the map points layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {MapLayerModel} from "./map-layer-model"

export const kMapPointLayerType = "mapPointLayer"

export const MapPointLayerModel = MapLayerModel
  .named('MapPointLayerModel')
  .props({
    type: types.optional(types.literal(kMapPointLayerType), kMapPointLayerType)
  })
  .views(self => ({
  }))
  .actions(self => ({
  }))

export interface IMapPointLayerModel extends Instance<typeof MapPointLayerModel> {
}

export interface IMapPointLayerModelSnapshot extends SnapshotIn<typeof MapPointLayerModel> {
}
