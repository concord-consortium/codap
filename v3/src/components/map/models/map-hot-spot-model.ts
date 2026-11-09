import { isEqual } from "lodash"
import { getSnapshot, Instance, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"

export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false,
  // Kernel bandwidth in meters on the ground; undefined means compute a default from the data's spread
  bandwidth: types.maybe(types.number),
  opacity: 0.75,
  lowColor: "#000000",
  highColor: "#ffffff"
})
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    },
    setBandwidth(bandwidth: Maybe<number>) {
      self.bandwidth = bandwidth
    },
    setOpacity(opacity: number) {
      self.opacity = opacity
    },
    setLowColor(color: string) {
      self.lowColor = color
    },
    setHighColor(color: string) {
      self.highColor = color
    }
  }))
  .actions(applyModelChange)

export interface IMapHotSpotModel extends Instance<typeof MapHotSpotModel> {}

export const kDefaultHotSpotSnapshot = getSnapshot(MapHotSpotModel.create())

export function isDefaultHotSpotModel(hotSpot: IMapHotSpotModel) {
  return isEqual(getSnapshot(hotSpot), kDefaultHotSpotSnapshot)
}
