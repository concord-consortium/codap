import { Instance, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"

/**
 * Hot spot settings for a map point layer. Gated by the `mapHotSpot` feature flag
 * at the affordances (inspector control, drawn layer); the model itself is always present.
 */
export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false
})
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))
  .actions(applyModelChange)

export interface IMapHotSpotModel extends Instance<typeof MapHotSpotModel> {}
