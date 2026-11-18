import { isEqual } from "lodash"
import { getSnapshot, Instance, SnapshotIn, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"
import { ILatLongSource } from "../map-types"
import {
  HotSpotColorRamp, HotSpotColorRamps, kDefaultHotSpotColorRamp, kDefaultHotSpotHighColor, kDefaultHotSpotLowColor
} from "../utilities/hot-spot-color-ramps"
import { computeHotSpotSurface, IHotSpotSurface } from "../utilities/hot-spot-utils"

export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false,
  // Kernel bandwidth in meters on the ground; undefined means compute a default from the data's spread
  bandwidth: types.maybe(types.number),
  opacity: 0.75,
  colorRamp: types.optional(types.enumeration([...HotSpotColorRamps]), kDefaultHotSpotColorRamp),
  lowColor: kDefaultHotSpotLowColor,
  highColor: kDefaultHotSpotHighColor
})
  .volatile(() => ({
    latLongSource: undefined as Maybe<ILatLongSource>,
    dynamicOpacity: undefined as Maybe<number>
  }))
  .views(self => ({
    get displayOpacity() {
      return self.dynamicOpacity ?? self.opacity
    },
    get hotSpotSurface(): Maybe<IHotSpotSurface> {
      return computeHotSpotSurface(self.latLongSource?.plottedLatLongs ?? [], self.bandwidth)
    }
  }))
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    },
    setBandwidth(bandwidth: Maybe<number>) {
      self.bandwidth = bandwidth
    },
    setOpacity(opacity: number) {
      self.opacity = opacity
      self.dynamicOpacity = undefined
    },
    setDynamicOpacity(opacity: Maybe<number>) {
      self.dynamicOpacity = opacity
    },
    setColorRamp(colorRamp: HotSpotColorRamp) {
      self.colorRamp = colorRamp
    },
    setLowColor(color: string) {
      self.lowColor = color
    },
    setHighColor(color: string) {
      self.highColor = color
    },
    setLatLongSource(latLongSource: ILatLongSource) {
      self.latLongSource = latLongSource
    }
  }))
  .actions(applyModelChange)

export interface IMapHotSpotModel extends Instance<typeof MapHotSpotModel> {}
export interface IMapHotSpotModelSnapshot extends SnapshotIn<typeof MapHotSpotModel> {}

export const kDefaultHotSpotSnapshot = getSnapshot(MapHotSpotModel.create())

export function isDefaultHotSpotModel(hotSpot: IMapHotSpotModel) {
  return isEqual(getSnapshot(hotSpot), kDefaultHotSpotSnapshot)
}
