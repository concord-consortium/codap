import { isEqual } from "lodash"
import { getSnapshot, Instance, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"

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

export const kDefaultHotSpotSnapshot = getSnapshot(MapHotSpotModel.create())

export function isDefaultHotSpotModel(hotSpot: IMapHotSpotModel) {
  return isEqual(getSnapshot(hotSpot), kDefaultHotSpotSnapshot)
}
