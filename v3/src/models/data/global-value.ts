import {Instance, types} from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"

export interface GlobalValueProperties {
  id: string
  handle: string
  value: number
}

const identifier = uniqueId();

export const GlobalValue = types.model("GlobalValue", {
    id: types.optional(types.identifier, identifier),
    //TODO: replace "slider-1" w/ f() that returns unique but semantic name based on instantiation context
    handle: types.optional(types.string, () => 'slider-1' ),
    value: types.number
  })
  .actions(self => ({
    setValue(val: number) {
      self.value = val
    }
  }))

export const GlobalValuesStore = types
  .model({
    globals: types.array(GlobalValue)
  })
  .actions(self => ({
    addGlobalValue(id: string, value: number){
      self.globals.push(GlobalValue.create({ value }))
    },
  }))
  .views(self => {
    return {
      getValueByHandle(handle: string) {
        return self.globals.filter(g => g.handle === handle)
      }
    }
})

export interface IGlobalValue extends Instance<typeof GlobalValue> {}
export interface IGlobalsStore extends Instance<typeof GlobalValuesStore> {}
