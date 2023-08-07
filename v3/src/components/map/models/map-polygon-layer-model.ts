/**
 * MapPolygonLayerModel keeps track of the state of the map polygon layer.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {MapLayerModel} from "./map-layer-model"

export const kMapPolygonLayerType = "mapPolygonLayer"

export const MapPolygonLayerModel = MapLayerModel
  .named('MapPolygonLayerModel')
  .props({
    type: types.optional(types.literal(kMapPolygonLayerType), kMapPolygonLayerType)
  })
  .views(self => ({
  }))
  .actions(self => ({
  }))

export interface IMapPolygonLayerModel extends Instance<typeof MapPolygonLayerModel> {}

export interface IMapPolygonLayerModelSnapshot extends SnapshotIn<typeof MapPolygonLayerModel> {}
