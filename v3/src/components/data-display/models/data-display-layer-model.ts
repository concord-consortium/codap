import {Instance, types} from "mobx-state-tree"
import { typedId } from "../../../utilities/js-utils"
import {DataConfigurationModelUnion} from "./data-configuration-union"

export const kUnknownLayerModelType = "unknownLayer"

export const DataDisplayLayerModel = types.model("DataDisplayLayerModel", {
    id: types.optional(types.identifier, () => typedId("LAYR")),
    type: types.optional(types.string, kUnknownLayerModelType),
    dataConfiguration: types.optional(DataConfigurationModelUnion,
      () => { throw "dataConfiguration must be overridden" }),
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
