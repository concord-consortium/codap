import {Instance, types} from "mobx-state-tree"
import {DataConfigurationModel} from "./data-configuration-model"
import { typedId } from "../../../utilities/js-utils"

export const kUnknownLayerModelType = "unknownLayer"

export const DataDisplayLayerModel = types.model("DataDisplayLayerModel", {
    id: types.optional(types.identifier, () => typedId("LAYR")),
    type: types.optional(types.string, kUnknownLayerModelType),
    dataConfiguration: types.optional(DataConfigurationModel, () => DataConfigurationModel.create()),
  })
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

export interface IDataDisplayLayerModel extends Instance<typeof DataDisplayLayerModel> {}
