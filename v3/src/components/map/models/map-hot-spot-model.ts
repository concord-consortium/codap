import { isEqual } from "lodash"
import { getSnapshot, Instance, SnapshotIn, types } from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"
import { ILatLongSource } from "../map-types"
import {
  HotSpotColorRamp, HotSpotColorRamps, isHotSpotColorRamp, kDefaultHotSpotColorRamp, kDefaultHotSpotHighColor,
  kDefaultHotSpotLowColor
} from "../utilities/hot-spot-color-ramps"
import {
  computeDefaultBandwidth, computeHotSpotSurface, getEffectiveColorBins, HotSpotColorBins, IHotSpotSurface,
  isHotSpotColorBins, kContinuousColorBins
} from "../utilities/hot-spot-utils"

// Separate from the real MapHotSpotModel so it can filter out an illegal colorRamp or colorBins.
const BaseMapHotSpotModel = types.model("MapHotSpotModel", {
  isVisible: false,
  // Kernel bandwidth in meters on the ground; undefined means compute a default from the data's spread
  bandwidth: types.maybe(types.number),
  opacity: 0.75,
  colorRamp: types.optional(types.enumeration([...HotSpotColorRamps]), kDefaultHotSpotColorRamp),
  lowColor: kDefaultHotSpotLowColor,
  highColor: kDefaultHotSpotHighColor,
  colorBins: types.optional(types.union(types.literal(kContinuousColorBins), types.number), kContinuousColorBins)
})

// A saved colorRamp or colorBins is unvalidated: it may come from a build with ramps or bins this one doesn't have
export interface IMapHotSpotModelSnapshot
  extends Omit<SnapshotIn<typeof BaseMapHotSpotModel>, "colorRamp" | "colorBins"> {
  colorRamp?: string
  colorBins?: number | string
}

export const MapHotSpotModel = BaseMapHotSpotModel
  // Drop a color ramp this build doesn't know, or color bins that aren't valid, so the hot spot loads with
  // the default for that property
  .preProcessSnapshot((snap: Maybe<IMapHotSpotModelSnapshot>) => {
    const { colorRamp, colorBins, ...others } = snap ?? {}
    return {
      ...others,
      ...(isHotSpotColorRamp(colorRamp) ? { colorRamp } : {}),
      ...(isHotSpotColorBins(colorBins) ? { colorBins } : {})
    }
  })
  .volatile(() => ({
    latLongSource: undefined as Maybe<ILatLongSource>,
    dynamicOpacity: undefined as Maybe<number>,
    dynamicBandwidth: undefined as Maybe<number>,
    dynamicColorBins: undefined as Maybe<HotSpotColorBins>
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
    },
    // The color bins that have been set (ignoring any in-progress slider value), limited to the allowed range
    get effectiveColorBins() {
      return getEffectiveColorBins(self.colorBins)
    },
    // The color bins to render: the in-progress slider value if there is one, otherwise the set value
    get displayColorBins() {
      return getEffectiveColorBins(self.dynamicColorBins ?? self.colorBins)
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
    setColorBins(colorBins: HotSpotColorBins) {
      self.colorBins = colorBins
      self.dynamicColorBins = undefined
    },
    setDynamicColorBins(colorBins: Maybe<HotSpotColorBins>) {
      self.dynamicColorBins = colorBins
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
