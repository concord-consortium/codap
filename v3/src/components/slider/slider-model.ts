import {getSnapshot, Instance, types} from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"
import { NumericAxisModel, EmptyAxisModel } from "../graph/models/axis-model"
export interface SliderProperties {
  id: string
  name: string
  value: number
  axis: typeof NumericAxisModel
}

const newBottomAxis = () => {
  return NumericAxisModel.create({
    type: 'numeric',
    scale: 'linear',
    place: 'bottom',
    min: 0,
    max: 12
  })
}

export const ScaleTypes = ["linear", "log", "ordinal", "band"] as const
export type IScaleType = typeof ScaleTypes[number]
export const kSliderPadding = 60
export const kSliderDefaultWidth = 300

export const SliderModel = types.model("SliderModel", {
    id: types.optional(types.identifier, () => uniqueId()),
    name: types.string,
    value: types.number,
    axis: types.optional(NumericAxisModel, getSnapshot(newBottomAxis())),
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
