/**
 * MapLayerModel serves as a base model for map layers: MapPolygonLayerModel and MapPointLayerModel.
 */
import {DataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"

export const MapLayerModel = DataDisplayLayerModel
  .named('MapLayerModel')
  .props({
  })
  .views(self => ({
  }))
  .actions(self => ({
  }))
