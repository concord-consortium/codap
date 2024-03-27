import {Instance, SnapshotIn, types} from "mobx-state-tree"
import { typedId } from "../../utilities/js-utils"
import { getDocumentContentFromNode } from "../../utilities/mst-document-utils"

export const kDefaultNamePrefix = "v"

// represents a globally accessible value, such as the value of a slider
export const GlobalValue = types.model("GlobalValue", {
    id: types.optional(types.identifier, () => typedId("GLOB")),
    name: types.string,
    _value: types.number
  })
  .preProcessSnapshot((snap: any) => {
    const { value: _value, ...others } = snap
    return _value != null ? { _value, ...others } : snap
  })
  .volatile(self => ({
    // defined while dragging (or animating?), undefined otherwise
    dynamicValue: undefined as number | undefined
  }))
  .views(self => ({
    get value() {
      return self.dynamicValue ?? self._value
    },
    get isUpdatingDynamically() {
      return self.dynamicValue != null
    }
  }))
  .actions(self => ({
    setName(name: string) {
      self.name = name
    },
    setDynamicValue(value: number) {
      self.dynamicValue = value
    },
    setValue(value: number) {
      self._value = value
      self.dynamicValue = undefined

      // Broadcast update to all plugins
      getDocumentContentFromNode(self)?.broadcastMessage({
        action: "notify",
        resource: `global[${self.name}]`,
        values: {
          globalValue: self.value
        }
      }, (response: any) => console.log(` .. message response`, response))
    }
  }))
export interface IGlobalValue extends Instance<typeof GlobalValue> {}
export interface IGlobalValueSnapshot extends SnapshotIn<typeof GlobalValue> {}
