import { isEqual } from "lodash"
import { getSnapshot, Instance, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"
import { ILatLongSource } from "../map-types"
import { computeDefaultBandwidth, computeHotSpotSurface, IHotSpotSurface } from "../utilities/hot-spot-utils"

export const MapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false,
  // Kernel bandwidth in meters on the ground; undefined means compute a default from the data's spread
  bandwidth: types.maybe(types.number),
  opacity: 0.75,
  lowColor: "#000000",
  highColor: "#ffffff"
})
  .volatile(() => ({
    latLongSource: undefined as Maybe<ILatLongSource>,
    dynamicOpacity: undefined as Maybe<number>,
    dynamicBandwidth: undefined as Maybe<number>
  }))
  .views(self => ({
    get plottedLatLongs() {
      return self.latLongSource?.plottedLatLongs ?? []
    }
  }))
  .views(self => ({
    get displayOpacity() {
      return self.dynamicOpacity ?? self.opacity
    },
    // True while the bandwidth is changing interactively, so rendering should favor speed over quality
    get shouldOptimize() {
      return self.dynamicBandwidth != null
    },
    get defaultBandwidth() {
      return computeDefaultBandwidth(self.plottedLatLongs)
    },
    get hotSpotSurface(): Maybe<IHotSpotSurface> {
      return computeHotSpotSurface(self.plottedLatLongs, self.dynamicBandwidth ?? self.bandwidth)
    }
  }))
  .views(self => ({
    // The bandwidth that has been set (ignoring any in-progress slider value), or the default if none has been set
    get effectiveBandwidth() {
      return self.bandwidth && self.bandwidth > 0 ? self.bandwidth : self.defaultBandwidth
    }
  }))
  .views(self => ({
    // The bandwidth to render: the in-progress slider value if there is one, otherwise the effective bandwidth
    get displayBandwidth() {
      return self.dynamicBandwidth ?? self.effectiveBandwidth
    }
  }))
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    },
    setBandwidth(bandwidth: Maybe<number>) {
      self.bandwidth = bandwidth
      self.dynamicBandwidth = undefined
    },
    setDynamicBandwidth(bandwidth: Maybe<number>) {
      self.dynamicBandwidth = bandwidth
    },
    setOpacity(opacity: number) {
      self.opacity = opacity
      self.dynamicOpacity = undefined
    },
    setDynamicOpacity(opacity: Maybe<number>) {
      self.dynamicOpacity = opacity
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

export const kDefaultHotSpotSnapshot = getSnapshot(MapHotSpotModel.create())

export function isDefaultHotSpotModel(hotSpot: IMapHotSpotModel) {
  return isEqual(getSnapshot(hotSpot), kDefaultHotSpotSnapshot)
}
