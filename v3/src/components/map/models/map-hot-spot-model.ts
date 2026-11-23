import { isEqual } from "lodash"
import { getSnapshot, Instance, SnapshotIn, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"
import { ILatLongSource } from "../map-types"
import {
  HotSpotColorRamp, HotSpotColorRamps, isHotSpotColorRamp, kDefaultHotSpotColorRamp, kDefaultHotSpotHighColor,
  kDefaultHotSpotLowColor
} from "../utilities/hot-spot-color-ramps"
import { computeDefaultBandwidth, computeHotSpotSurface, IHotSpotSurface } from "../utilities/hot-spot-utils"

// Separate from the real MapHotSpotModel so it can filter out an illegal colorRamp.
const BaseMapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false,
  // Kernel bandwidth in meters on the ground; undefined means compute a default from the data's spread
  bandwidth: types.maybe(types.number),
  opacity: 0.75,
  colorRamp: types.optional(types.enumeration([...HotSpotColorRamps]), kDefaultHotSpotColorRamp),
  lowColor: kDefaultHotSpotLowColor,
  highColor: kDefaultHotSpotHighColor
})

// A saved color ramp is an unvalidated string: it may come from a build with ramps this one doesn't have
export interface IMapHotSpotModelSnapshot extends Omit<SnapshotIn<typeof BaseMapHotSpotModel>, "colorRamp"> {
  colorRamp?: string
}

export const MapHotSpotModel = BaseMapHotSpotModel
  // Drop a color ramp this build doesn't know, so the hot spot loads with the default ramp
  .preProcessSnapshot((snap: Maybe<IMapHotSpotModelSnapshot>) => {
    const { colorRamp, ...others } = snap ?? {}
    return isHotSpotColorRamp(colorRamp) ? { ...others, colorRamp } : others
  })
  .volatile(() => ({
    latLongSource: undefined as Maybe<ILatLongSource>,
    dynamicOpacity: undefined as Maybe<number>,
    dynamicBandwidth: undefined as Maybe<number>
  }))
  .views(self => ({
    // True while the bandwidth is changing interactively, so rendering should favor speed over quality
    get shouldOptimize() {
      return self.dynamicBandwidth != null
    },
    get plottedLatLongs() {
      return self.latLongSource?.plottedLatLongs ?? []
    }
  }))
  .views(self => ({
    get displayOpacity() {
      return self.dynamicOpacity ?? self.opacity
    },
    get defaultBandwidth() {
      return computeDefaultBandwidth(self.plottedLatLongs)
    }
  }))
  .views(self => ({
    // The bandwidth that has been set (ignoring any in-progress slider value), or the default if none has been set
    get effectiveBandwidth() {
      return self.bandwidth && self.bandwidth > 0 && Number.isFinite(self.bandwidth)
        ? self.bandwidth : self.defaultBandwidth
    }
  }))
  .views(self => ({
    // The bandwidth to render: the in-progress slider value if there is one, otherwise the effective bandwidth
    get displayBandwidth() {
      return self.dynamicBandwidth ?? self.effectiveBandwidth
    }
  }))
  .views(self => ({
    get hotSpotSurface(): Maybe<IHotSpotSurface> {
      return computeHotSpotSurface(self.plottedLatLongs, self.displayBandwidth, self.shouldOptimize)
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

export const kDefaultHotSpotSnapshot = getSnapshot(MapHotSpotModel.create())

export function isDefaultHotSpotModel(hotSpot: IMapHotSpotModel) {
  return isEqual(getSnapshot(hotSpot), kDefaultHotSpotSnapshot)
}
