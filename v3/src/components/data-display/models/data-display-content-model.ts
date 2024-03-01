/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {Instance, types} from "mobx-state-tree"
import {TileContentModel} from "../../../models/tiles/tile-content"
import {IDataSet} from "../../../models/data/data-set"
import {DataDisplayLayerModelUnion} from "./data-display-layer-union"
import {DisplayItemDescriptionModel} from "./display-item-description-model"
import {GraphPlace} from "../../axis-graph-shared"

export const DataDisplayContentModel = TileContentModel
  .named("DataDisplayContentModel")
  .props({
    layers: types.array(DataDisplayLayerModelUnion),
    pointDescription: types.optional(DisplayItemDescriptionModel, () => DisplayItemDescriptionModel.create()),
  })
  .volatile(() => ({
    animationEnabled: false,
  }))
  .views(() => ({
    placeCanAcceptAttributeIDDrop(place: GraphPlace,
                             dataset: IDataSet | undefined, 
                             attributeID: string | undefined): boolean {
      return false
    }
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
