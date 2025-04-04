import {Instance, types} from "mobx-state-tree"
import {DataDisplayLayerModel, IDataDisplayLayerModel, kUnknownLayerModelType} from "./data-display-layer-model"
import {GraphPointLayerModel, IGraphPointLayerModel, IGraphPointLayerModelSnapshot, kGraphPointLayerType}
  from "../../graph/models/graph-point-layer-model"
import {IMapPointLayerModel, IMapPointLayerModelSnapshot, MapPointLayerModel}
  from "../../map/models/map-point-layer-model"
import {kMapPinLayerType, kMapPointLayerType, kMapPolygonLayerType} from "../../map/map-types"
import { IMapPinLayerModel, IMapPinLayerModelSnapshot, MapPinLayerModel } from "../../map/models/map-pin-layer-model"
import {IMapBaseLayerModel, IMapBaseLayerModelSnapshot, kMapBaseLayerType, MapBaseLayerModel}
  from "../../map/models/map-base-layer-model"
import {IMapPolygonLayerModel, IMapPolygonLayerModelSnapshot, MapPolygonLayerModel}
  from "../../map/models/map-polygon-layer-model"

export const UnknownDataDisplayLayerModel = DataDisplayLayerModel
  .named("UnknownDataDisplayLayerModel")
  .props({
    type: "Unknown"
  })
export interface IUnknownDataDisplayLayerModel extends Instance<typeof UnknownDataDisplayLayerModel> {}

export function isUnknownDataDisplayLayerModel(
  dataDisplayModel: IDataDisplayLayerModel): dataDisplayModel is IUnknownDataDisplayLayerModel {
  return dataDisplayModel.type === kUnknownLayerModelType
}


const dataDisplayLayerTypeDispatcher = (displayLayerModelSnap: IDataDisplayLayerSnapshotUnion) => {
  switch (displayLayerModelSnap.type) {
    case kGraphPointLayerType: return GraphPointLayerModel
    case kMapBaseLayerType: return MapBaseLayerModel
    case kMapPinLayerType: return MapPinLayerModel
    case kMapPointLayerType: return MapPointLayerModel
    case kMapPolygonLayerType: return MapPolygonLayerModel
    default: return UnknownDataDisplayLayerModel
  }
}

export const DataDisplayLayerModelUnion = types.union({ dispatcher: dataDisplayLayerTypeDispatcher },
  GraphPointLayerModel, MapBaseLayerModel, MapPinLayerModel, MapPolygonLayerModel, MapPointLayerModel)
export type IDataDisplayLayerModelUnion =
  IGraphPointLayerModel | IMapBaseLayerModel | IMapPinLayerModel | IMapPolygonLayerModel | IMapPointLayerModel
export type IDataDisplayLayerSnapshotUnion = IGraphPointLayerModelSnapshot |
  IMapBaseLayerModelSnapshot | IMapPinLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot
