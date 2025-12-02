import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { allAxisModels, AxisModel, AxisModelType, AxisModelTypes, IAxisModel } from "./axis-model"
import { IBaseNumericAxisModel, IBaseNumericAxisModelSnapshot } from "./base-numeric-axis-models"

/**
 * A dynamic union of axis models. Its typescript type is `AxisModel`.
 *
 * This uses MST's `late()`. It appears that `late()` runs the first time the
 * union is actually used by MST. For example to deserialize a snapshot or to
 * create an model instance. For this to work properly, these uses need to
 * happen after all necessary tiles are registered.
 *
 * By default a late type like this will have a type of `any`. All types in this
 * late union extend TileContentModel, so it is overridden to be `AxisModel`.
 * This doesn't affect the MST runtime types.
 */
export const AxisModelUnion = types.late<typeof AxisModel>(() => {
  return types.union(...allAxisModels()) as typeof AxisModel
})
export type IAxisModelUnion = Instance<typeof AxisModelUnion> | IBaseNumericAxisModel
export type IAxisModelSnapshotUnion = SnapshotIn<typeof AxisModelUnion> | IBaseNumericAxisModelSnapshot

export function isAxisModelInUnion(model?: IAxisModel): model is IAxisModelUnion {
  if (!model) return false
  return (AxisModelTypes.includes(model.type as AxisModelType))
}
