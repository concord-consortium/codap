import {Instance} from "mobx-state-tree"
import {PlotTypes} from "./adornment-types"
import {AdornmentsBaseStore} from "./adornments-base-store"
import {getAdornmentsMenuItemsFromTheStore} from "./adornments-store-utils"

/**
 * The AdornmentsStore is a model that manages the adornments that are displayed on a graph. It provides methods for
 * showing and hiding adornments, and for updating the categories of the adornments.
 */
export const AdornmentsStore = AdornmentsBaseStore
  .named("AdornmentsStore")
  .views(self => ({
    getAdornmentsMenuItems(plotType: PlotTypes) {
      return getAdornmentsMenuItemsFromTheStore(self, plotType)
    },
  }))

export interface IAdornmentsStore extends Instance<typeof AdornmentsStore> {
}
