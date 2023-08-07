import {Instance, types} from "mobx-state-tree"
import {DataDisplayLayerModel, IDataDisplayLayerModel, kUnknownLayerModelType} from "./data-display-layer-model"
import {GraphPointLayerModel, IGraphPointLayerModel, IGraphPointLayerModelSnapshot}
  from "../../graph/models/graph-point-layer-model"
import {IMapPointLayerModel, IMapPointLayerModelSnapshot, MapPointLayerModel}
  from "../../map/models/map-point-layer-model"
import {MapLayerModel} from "../../map/models/map-layer-model"
import {IMapBaseLayerModel, IMapBaseLayerModelSnapshot, MapBaseLayerModel} from "../../map/models/map-base-layer-model"
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
    case "graphPointLayer": return GraphPointLayerModel
    case "mapBaseLayer": return MapBaseLayerModel
    case "mapPointLayer": return MapPointLayerModel
    case "mapPolygonLayer": return MapPolygonLayerModel
    default: return MapLayerModel
  }
}

export const DataDisplayLayerModelUnion = types.union({ dispatcher: dataDisplayLayerTypeDispatcher },
  GraphPointLayerModel, MapBaseLayerModel, MapPolygonLayerModel, MapPointLayerModel)
export type IDataDisplayLayerModelUnion =
  IGraphPointLayerModel | IMapBaseLayerModel | IMapPolygonLayerModel | IMapPointLayerModel
export type IDataDisplayLayerSnapshotUnion = IGraphPointLayerModelSnapshot |
  IMapBaseLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot
