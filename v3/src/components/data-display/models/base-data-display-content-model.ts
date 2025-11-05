import { IAnyStateTreeNode } from "mobx-state-tree"
import { IDataSet } from "../../../models/data/data-set"
import { GraphPlace } from "../../axis-graph-shared"
import { IDataConfigurationModel } from "./data-configuration-model"

export interface IBaseLayerModel {
  layerIndex: number
  id: string
  dataConfiguration: IDataConfigurationModel
  isVisible: boolean
};

export interface IBaseDataDisplayModel extends IAnyStateTreeNode {
  placeCanAcceptAttributeIDDrop: (place: GraphPlace,
    dataset: IDataSet | undefined,
    attributeID: string | undefined) => boolean,
  layers: IBaseLayerModel[]
}
