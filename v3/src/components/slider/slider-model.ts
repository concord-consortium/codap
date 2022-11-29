import {getSnapshot, Instance, types} from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"
import { INumericAxisModel, NumericAxisModel } from "../graph/models/axis-model"
export interface SliderProperties {
  id: string
  name: string
  value: number
  axis: typeof NumericAxisModel
}

export const ScaleTypes = ["linear", "log", "ordinal", "band"] as const
export type IScaleType = typeof ScaleTypes[number]
export const kSliderPadding = 60
export const kSliderDefaultWidth = 600

export const SliderModel = types.model("SliderModel", {
    id: types.optional(types.identifier, () => uniqueId()),
    name: types.string,
    value: types.number,
    axis: types.optional(NumericAxisModel, {
      type: 'numeric',
      scale: 'linear',
      place: 'bottom',
      min: 0,
      max: 12
    }),
  })
  .actions(self => ({
    setName(str: string) {
      self.name = str
    },
    setValue(n: number) {
      self.value = n
    }
  }))
  .views(self => ({
    getDomain() {
      return [self.axis.min, self.axis.max]
    }
  }))


export interface ISliderModel extends Instance<typeof SliderModel> {}
