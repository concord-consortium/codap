import {Instance, types} from "mobx-state-tree"
import {typedId} from "../../../utilities/js-utils"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {DataConfigurationModel} from "./data-configuration-model"

export const kUnknownLayerModelType = "unknownLayer"

export const DataDisplayLayerModel = types.model("DataDisplayLayerModel", {
  id: types.optional(types.identifier, () => typedId("LAYR")),
  type: types.optional(types.string, kUnknownLayerModelType),
  layerIndex: types.optional(types.number, 0),
  dataConfiguration: types.optional(DataConfigurationModel, () => DataConfigurationModel.create()),
})
  .views(self => ({
    get data() {
      return self.dataConfiguration.dataset
    },
    get metadata() {
      return self.dataConfiguration.metadata
    }
  }))
  .actions(applyModelChange)

export interface IDataDisplayLayerModel extends Instance<typeof DataDisplayLayerModel> {
}
