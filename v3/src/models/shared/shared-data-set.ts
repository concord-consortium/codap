import { getType, Instance, SnapshotIn, types } from "mobx-state-tree"
import { DataSet, IDataSet } from "../data/data-set"
import { ISharedModel, ISharedModelSnapshot, SharedModel } from "./shared-model"

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
export interface ISharedDataSetSnapshot extends SnapshotIn<typeof SharedDataSet> {}

export function isSharedDataSet(model?: ISharedModel): model is ISharedDataSet {
  return model ? getType(model) === SharedDataSet : false
}

export function isSharedDataSetSnapshot(snapshot?: ISharedModelSnapshot): snapshot is ISharedDataSetSnapshot {
  return snapshot ? snapshot.type === kSharedDataSetType : false
}
