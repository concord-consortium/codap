import {Instance, types} from "mobx-state-tree"
import {PlotTypes, RulerStateKey} from "./adornment-types"
import {AdornmentsBaseStore} from "./adornments-base-store"
import {getAdornmentsMenuItemsFromTheStore} from "./adornments-store-utils"

/**
 * The AdornmentsStore is a model that manages the adornments that are displayed on a graph. It provides methods for
 * showing and hiding adornments, and for updating the categories of the adornments.
 */
export const AdornmentsStore = AdornmentsBaseStore
  .named("AdornmentsStore")
  .props({
    rulerState: types.map(types.boolean)
})
  .actions(self => ({
    afterCreate() {
      self.rulerState.set("measuresOfCenter", true)
    },
    setVisibility(key: RulerStateKey, visible: boolean) {
      self.rulerState.set(key, visible)
    },
    toggleVisibility(key: RulerStateKey) {
      self.rulerState.set(key, !self.rulerState.get(key))
    }
  }))
  .views(self => ({
    getVisibility(key: RulerStateKey) {
      return !!self.rulerState.get(key)
    },
    getAdornmentsMenuItems(plotType: PlotTypes) {
      return getAdornmentsMenuItemsFromTheStore(self, plotType)
    },
  }))

export interface IAdornmentsStore extends Instance<typeof AdornmentsStore> {
}
