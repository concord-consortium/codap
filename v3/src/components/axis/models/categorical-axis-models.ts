import { Instance, SnapshotIn } from "mobx-state-tree"
import { AxisModel, axisModelType, IAxisModel, registerAxisModel } from "./axis-model"

/*
 * BaseCategoricalAxisModel (abstract)
 */
export const BaseCategoricalAxisModel = AxisModel
  .named("BaseCategoricalAxisModel")
  .props({
    scale: "band"
  })
export interface IBaseCategoricalAxisModel extends Instance<typeof BaseCategoricalAxisModel> {}
export interface IBaseCategoricalAxisModelSnapshot extends SnapshotIn<typeof BaseCategoricalAxisModel> {}

/*
 * CategoricalAxisModel
 */
export const CategoricalAxisModel = BaseCategoricalAxisModel
  .named("CategoricalAxisModel")
  .props({
    type: axisModelType("categorical")
  })
export interface ICategoricalAxisModel extends Instance<typeof CategoricalAxisModel> {}
export interface ICategoricalAxisModelSnapshot extends SnapshotIn<typeof CategoricalAxisModel> {}

export function isCategoricalAxisModel(axisModel?: IAxisModel): axisModel is ICategoricalAxisModel {
  return axisModel?.type === "categorical"
}

registerAxisModel("categorical", CategoricalAxisModel)

/*
 * ColorAxisModel
 */
export const ColorAxisModel = CategoricalAxisModel
  .named("ColorAxisModel")
  .props({
    type: axisModelType("color")
  })
export interface IColorAxisModel extends Instance<typeof ColorAxisModel> {}
export interface IColorAxisModelSnapshot extends SnapshotIn<typeof ColorAxisModel> {}

export function isColorAxisModel(axisModel?: IAxisModel): axisModel is IColorAxisModel {
  return axisModel?.type === "color"
}

registerAxisModel("color", ColorAxisModel)

/*
 * utilities
 */
type IAnyCategoricalAxisModel = ICategoricalAxisModel | IColorAxisModel

export function isAnyCategoricalAxisModel(axisModel?: IAxisModel): axisModel is IAnyCategoricalAxisModel {
  return isCategoricalAxisModel(axisModel) || isColorAxisModel(axisModel)
}
