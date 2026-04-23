/**
 * MapLayerModel serves as a base model for map layers: MapPolygonLayerModel and MapPointLayerModel.
 */
import {Instance, types} from "mobx-state-tree"
import {ICollectionModel} from "../../../models/data/collection"
import {DataDisplayLayerModel, IDataDisplayLayerModel} from "../../data-display/models/data-display-layer-model"
import {DisplayItemDescriptionModel} from "../../data-display/models/display-item-description-model"
import {isMapLayerType} from "../map-types"

export const MapLayerModel = DataDisplayLayerModel
  .named('MapLayerModel')
  .props({
    isVisible: true,
    displayItemDescription: types.optional(DisplayItemDescriptionModel, () => DisplayItemDescriptionModel.create()),
  })
  .views(self => ({
    get titleCollection(): Maybe<ICollectionModel> {
      return undefined
    }
  }))
  .actions(self => ({
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))

export interface IMapLayerModel extends Instance<typeof MapLayerModel> {}

export function isMapLayerModel(layerModel?: IDataDisplayLayerModel): layerModel is IMapLayerModel {
  return isMapLayerType(layerModel?.type)
}
