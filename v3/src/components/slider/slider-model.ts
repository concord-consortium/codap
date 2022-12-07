import { Instance, types} from "mobx-state-tree"
import { NumericAxisModel } from "../axis/models/axis-model"
import { GlobalValue } from "../../models/data/global-value"
import { uniqueId } from "../../utilities/js-utils"
export interface SliderProperties {
  id: string
  name: string
  globalValue: typeof GlobalValue
  axis: typeof NumericAxisModel
}

export const ScaleTypes = ["linear", "log", "ordinal", "band"] as const
export type IScaleType = typeof ScaleTypes[number]

export const SliderModel = types.model("SliderModel", {
    id: types.optional(types.identifier, () => uniqueId()),
    name: types.string,
    globalValue: types.optional(GlobalValue, {
      value: .5
    }),
    axis: types.optional(NumericAxisModel, {
      type: 'numeric',
      scale: 'linear',
      place: 'bottom',
      min: 0,
      max: 300 // SYNC-WIDTH-ISSUE
    }),
  })
  .actions(self => ({
    setName(str: string) {
      self.name = str
    },
    setValue(n: number) {
      self.globalValue.setValue(n)
    }
  }))
  .views(self => ({
    getDomain() {
      return [self.axis.min, self.axis.max]
    }
  }))

export interface ISliderModel extends Instance<typeof SliderModel> {}
