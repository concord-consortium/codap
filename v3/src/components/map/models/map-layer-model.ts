/**
 * MapLayerModel serves as a base model for map layers: MapPolygonLayerModel and MapPointLayerModel.
 */
import {Instance, types} from "mobx-state-tree"
import {DataDisplayLayerModel, IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {kMapLayerTypes} from "../map-types"
import {DisplayItemDescriptionModel} from "../../data-display/models/display-item-description-model"

export const MapLayerModel = DataDisplayLayerModel
  .named('MapLayerModel')
  .props({
    isVisible: true,
    displayItemDescription: types.optional(DisplayItemDescriptionModel, () => DisplayItemDescriptionModel.create()),
  })
  .views(self => ({
  }))
  .actions(self => ({
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))

export interface IMapLayerModel extends Instance<typeof MapLayerModel> {}

export function isMapLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapLayerModel {
  return !!layerModel?.type && kMapLayerTypes.includes(layerModel.type)
}
