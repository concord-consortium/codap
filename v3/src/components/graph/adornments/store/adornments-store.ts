import {Instance} from "mobx-state-tree"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { PlotType } from "../../graphing-types"
import {AdornmentsBaseStore} from "./adornments-base-store"
import {getAdornmentsMenuItemsFromTheStore} from "./adornments-store-utils"

/**
 * The AdornmentsStore is a model that manages the adornments that are displayed on a graph. It provides methods for
 * showing and hiding adornments, and for updating the categories of the adornments.
 */
export const AdornmentsStore = AdornmentsBaseStore
  .named("AdornmentsStore")
  .views(self => ({
    getAdornmentsMenuItems(tile: ITileModel | undefined, plotType: PlotType, useGaussianOptions: boolean) {
      return getAdornmentsMenuItemsFromTheStore(self, tile, plotType, useGaussianOptions)
    },
  }))

export interface IAdornmentsStore extends Instance<typeof AdornmentsStore> {
}
