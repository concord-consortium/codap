import { Instance, types } from "mobx-state-tree"
import { kMovableValueType } from "./movable-value-types"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"


export const MovableValueModel = AdornmentModel
  .named('MovableValueModel')
  .props({
    type: 'Movable Value',
    value: types.number,
  })
  .actions(self => ({
    setValue(aValue: number) {
      self.value = aValue
    }
  }))
export interface IMovableValueModel extends Instance<typeof MovableValueModel> {}
export function isMovableValue(adornment: IAdornmentModel): adornment is IMovableValueModel {
  return adornment.type === kMovableValueType
}
