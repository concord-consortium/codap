import {Instance, types} from "mobx-state-tree"
import { typedId } from "../../utilities/js-utils"

export const kDefaultNamePrefix = "v"

// represents a globally accessible value, such as the value of a slider
export const GlobalValue = types.model("GlobalValue", {
    id: types.optional(types.identifier, () => typedId("GLOB")),
    name: types.string,
    value: types.number
  })
  .actions(self => ({
    setName(name: string) {
      self.name = name
    },
    setValue(val: number) {
      self.value = val
    }
  }))
export interface IGlobalValue extends Instance<typeof GlobalValue> {}
