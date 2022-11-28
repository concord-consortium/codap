import {Instance, types} from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"

export interface SliderProperties {
  id: string
  name: string
  value: number
  min: number
  max: number
}

export const ScaleTypes = ["linear", "log", "ordinal", "band"] as const
export type IScaleType = typeof ScaleTypes[number]
export const kSliderPadding = 60
export const kSliderDefaultWidth = 300

export const SliderModel = types.model("SliderModel", {
    id: types.optional(types.identifier, () => uniqueId()),
    name: types.string,
    value: types.number,
    min: types.number,
    max: types.number,
    width: types.number
  })
  .actions(self => ({
    setName(str: string) {
      self.name = str
    },
    setValue(n: number) {
      self.value = n
    },
    setMin(n: number){
      self.min = n
    },
    setMax(n: number){
      self.max = n
    },
    setSliderWidth(n: number){
      self.width = n
    }
  }))
  .views(self => ({
    getDomain() {
      return [self.min, self.max]
    },
    getAxisWidth(){
      return self.width - (kSliderPadding * .5)
    }
  }))


export interface ISliderModel extends Instance<typeof SliderModel> {}
