import { Instance } from "@concord-consortium/mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kCountType } from "./count-types"

export const CountModel = AdornmentModel
  .named('CountModel')
  .props({
    type: 'Count'
  })
export interface ICountModel extends Instance<typeof CountModel> {}
export function isCount(adornment: IAdornmentModel): adornment is ICountModel {
  return adornment.type === kCountType
}
