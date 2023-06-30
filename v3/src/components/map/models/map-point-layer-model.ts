/**
 * MapPointLayerModel keeps track of the state of the map points layer.
 */
import {MapLayerModel} from "./map-layer-model"
import {Instance, SnapshotIn} from "mobx-state-tree";

export const MapPointLayerModel = MapLayerModel
  .named('MapPointLayerModel').props({
  })
  .actions(self => ({
  }))
  .views(self => ({
  }))
  .actions(self => ({
  }))

export interface IMapPointLayerModel extends Instance<typeof MapPointLayerModel> {
}

export interface IMapPointLayerModelSnapshot extends SnapshotIn<typeof MapPointLayerModel> {
}
