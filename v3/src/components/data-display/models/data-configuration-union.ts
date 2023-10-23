import {Instance, types} from "mobx-state-tree"
import {
  DataConfigurationModel,
  IDataConfigurationModel,
  IDataConfigurationModelSnapshot,
  kDataConfigurationType,
  kUnknownDataConfigurationType
}
  from "./data-configuration-model"
import {GraphDataConfigurationModel, IGraphDataConfigurationModel, IGraphDataConfigurationModelSnapshot,
  kGraphDataConfigurationType} from "../../graph/models/graph-data-configuration-model"

export const UnknownDataConfigurationModel = DataConfigurationModel
  .named("UnknownDataConfigurationModel")
  .props({
    type: kUnknownDataConfigurationType
  })
export interface IUnknownDataConfigurationModel extends Instance<typeof UnknownDataConfigurationModel> {}

export function isUnknownDataConfigurationModel(
  dataConfigurationModel: IDataConfigurationModel): dataConfigurationModel is IUnknownDataConfigurationModel {
  return dataConfigurationModel.type === kUnknownDataConfigurationType
}


const dataConfigurationTypeDispatcher = (displayLayerModelSnap: IDataConfigurationSnapshotUnion) => {
  switch (displayLayerModelSnap.type) {
    case kDataConfigurationType: return DataConfigurationModel
    case kGraphDataConfigurationType: return GraphDataConfigurationModel
    default: return UnknownDataConfigurationModel
  }
}

export const DataConfigurationModelUnion = types.union({ dispatcher: dataConfigurationTypeDispatcher },
  DataConfigurationModel, GraphDataConfigurationModel)
export type IDataConfigurationModelUnion = IDataConfigurationModel | IGraphDataConfigurationModel
export type IDataConfigurationSnapshotUnion = IDataConfigurationModelSnapshot | IGraphDataConfigurationModelSnapshot
