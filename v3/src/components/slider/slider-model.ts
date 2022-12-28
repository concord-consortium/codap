import { Instance, types} from "mobx-state-tree"
import { NumericAxisModel } from "../axis/models/axis-model"
import { GlobalValue } from "../../models/data/global-value"
import { uniqueId } from "../../utilities/js-utils"

export const SliderModel = types.model("SliderModel", {
    id: types.optional(types.identifier, () => uniqueId()),
    multipleOf: 0.5,
    resolution: .01,
    globalValue: types.optional(GlobalValue, {
      // TODO: generate unique name from registry
      name: "slider-1",
      value: 0.5
    }),
    axis: types.optional(NumericAxisModel, {
      type: 'numeric',
      scale: 'linear',
      place: 'bottom',
      min: 0,
      max: 12
    }),
  })
  .views(self => ({
    get domain() {
      return self.axis.domain
    },
    get name() {
      return self.globalValue.name
    },
    get value() {
      return self.globalValue.value
    }
  }))
  .actions(self => ({
    setName(name: string) {
      self.globalValue.setName(name)
    },
    setValueRoundedToMultipleOf(n: number) {
      if (self.multipleOf !== 0) {
        n = Math.round(n / self.multipleOf) * self.multipleOf
      }
      self.globalValue.setValue(n)
    },
    setValue(n: number) {
      if (self.multipleOf !== 0) {
        n = Math.round(n / self.resolution) * self.resolution
      }
      self.globalValue.setValue(n)
    },
    setMultipleOf(n: number) {
      self.multipleOf = Math.abs(n)
    }
  }))

export interface ISliderModel extends Instance<typeof SliderModel> {}
