/**
 * MapBaseLayerModel keeps track of the state of the map points layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {MapLayerModel} from "./map-layer-model"

export const kMapBaseLayerType = "mapBaseLayer"

export const MapBaseLayerModel = MapLayerModel.named('MapBaseLayerModel')
  .props({
    type: types.optional(types.literal(kMapBaseLayerType), kMapBaseLayerType)
  })
  .views(self => ({
  }))
  .actions(self => ({
  }))

export interface IMapBaseLayerModel extends Instance<typeof MapBaseLayerModel> {}

export interface IMapBaseLayerModelSnapshot extends SnapshotIn<typeof MapBaseLayerModel> {}
