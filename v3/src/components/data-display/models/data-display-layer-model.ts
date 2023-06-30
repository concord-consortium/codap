import {types} from "mobx-state-tree"
import {DataConfigurationModel} from "./data-configuration-model"

export const DataDisplayLayerModel = types.model("DataDisplayLayerModel",)
  .props({
    dataConfiguration: types.optional(DataConfigurationModel, () => DataConfigurationModel.create()),
  })
  .actions(self => ({
  }))
  .views(self => ({
    get data() {
      return self.dataConfiguration.dataset
    },
    get metadata() {
      return self.dataConfiguration.metadata
    },
  }))
  .actions(self => ({
  }))
