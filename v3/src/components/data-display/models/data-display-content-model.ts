/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {Instance, types} from "mobx-state-tree"
import {TileContentModel} from "../../../models/tiles/tile-content"
import {DataDisplayLayerModelUnion} from "./data-display-layer-union"
import {PointDescriptionModel} from "./point-description-model"

export const DataDisplayContentModel = TileContentModel
  .named("DataDisplayContentModel")
  .props({
    layers: types.array(DataDisplayLayerModelUnion),
    pointDescription: types.optional(PointDescriptionModel, () => PointDescriptionModel.create()),
  })
  .volatile(() => ({
    animationEnabled: false,
  }))
  .actions(self => ({
    startAnimation() {
      self.animationEnabled = true
      setTimeout(() => this.stopAnimation(), 2000)
    },
    stopAnimation() {
      self.animationEnabled = false
    }
  }))
export interface IDataDisplayContentModel extends Instance<typeof DataDisplayContentModel> {}
