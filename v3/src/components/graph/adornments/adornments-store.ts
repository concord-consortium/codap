import {Instance} from "mobx-state-tree"
import {AdornmentsBaseStore} from "./adornments-base-store"
import {getAdornmentsMenuItemsFromTheStore} from "./adornments-store-utils"
import { PlotType } from "../graphing-types"

/**
 * The AdornmentsStore is a model that manages the adornments that are displayed on a graph. It provides methods for
 * showing and hiding adornments, and for updating the categories of the adornments.
 */
export const AdornmentsStore = AdornmentsBaseStore
  .named("AdornmentsStore")
  .views(self => ({
    getAdornmentsMenuItems(plotType: PlotType, useGaussianOptions: boolean) {
      return getAdornmentsMenuItemsFromTheStore(self, plotType, useGaussianOptions)
    },
  }))

export interface IAdornmentsStore extends Instance<typeof AdornmentsStore> {
}
