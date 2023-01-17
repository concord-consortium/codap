import { Instance, types } from "mobx-state-tree"
import { DataSet, IDataSet } from "../data/data-set"
import { SharedModel } from "./shared-model"

export const kSharedDataSetType = "SharedDataSet"

export const SharedDataSet = SharedModel
.named("SharedDataSet")
.props({
  type: types.optional(types.literal(kSharedDataSetType), kSharedDataSetType),
  providerId: "",
  dataSet: types.optional(DataSet, () => DataSet.create())
})
.actions(self => ({
  setDataSet(data: IDataSet) {
    self.dataSet = data
  }
}))
export interface ISharedDataSet extends Instance<typeof SharedDataSet> {}
