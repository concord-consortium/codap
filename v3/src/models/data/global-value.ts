import {Instance, types} from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"

export const GlobalValue = types.model("GlobalValue", {
    id: types.optional(types.identifier, () => uniqueId()),
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
