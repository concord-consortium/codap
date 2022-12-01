import {Instance, types} from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"

export interface GlobalValueProperties {
  id: string
  //name: string
  value: number
}

export const GlobalValue = types.model("GlobalValue", {
    id: types.optional(types.identifier, () => uniqueId()),
    //name: types.string,
    value: types.number
  })
  .actions(self => ({
    setValue(val: number) {
      self.value = val
    },
    // TODO - should globalValue have a name
    // and or should slider justy be named after global value
    // slider operates on a value with a name, and/or slider has a name
    // setName(n: string) {
    //   self.name = n
    // }
  }))


export const GlobalsStore = types
  .model({
    globals: types.map(GlobalValue)
  })
  .actions(self => ({
    addGlobalValue(id: string, value: number){
      self.globals.set(id, GlobalValue.create({ value }))
    }
  }))

export interface IGlobalValue extends Instance<typeof GlobalValue> {}
export interface IGlobalsStore extends Instance<typeof GlobalsStore> {}
