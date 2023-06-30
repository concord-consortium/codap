/**
 * MapPolygonLayerModel keeps track of the state of the map polygon layer.
 */
import {Instance, SnapshotIn} from "mobx-state-tree"
import {MapLayerModel} from "./map-layer-model"

export const MapPolygonLayerModel = MapLayerModel
  .named('MapPolygonLayerModel').props({type: "mapPolygonLayer"})
  .actions(self => ({
  }))
  .views(self => ({
  }))
  .actions(self => ({
  }))

export interface IMapPolygonLayerModel extends Instance<typeof MapPolygonLayerModel> {}

export interface IMapPolygonLayerModelSnapshot extends SnapshotIn<typeof MapPolygonLayerModel> {}
