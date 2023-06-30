/**
 * MapBaseLayerModel keeps track of the state of the map points layer.
 */
import {MapLayerModel} from "./map-layer-model"
import {Instance, SnapshotIn} from "mobx-state-tree"

export const MapBaseLayerModel = MapLayerModel.named('MapBaseLayerModel')
  .props({type: "mapBaseLayer"})
  .actions(self => ({
  }))
  .views(self => ({
  }))
  .actions(self => ({
  }))

export interface IMapBaseLayerModel extends Instance<typeof MapBaseLayerModel> {}

export interface IMapBaseLayerModelSnapshot extends SnapshotIn<typeof MapBaseLayerModel> {}
