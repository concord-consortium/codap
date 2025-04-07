import { chooseDecimalPlaces } from "../../../utilities/math-utils"
import { determineLevels, formatDate, mapLevelToPrecision } from "../../../utilities/date-utils"
import {Instance, SnapshotIn, isAlive, types} from "mobx-state-tree"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {AxisOrientation, AxisPlaces, IScaleType, ScaleTypes} from "../axis-types"

export const AxisModel = types.model("AxisModel", {
  type: types.optional(types.string, () => {
    throw "type must be overridden"
  }),
  place: types.enumeration([...AxisPlaces]),
  scale: types.optional(types.enumeration([...ScaleTypes]), "ordinal"),
  subType: types.optional(types.string, ""),
})
  .volatile(self => ({
    transitionDuration: 0
  }))
  .views(self => ({
    get orientation(): AxisOrientation {
      return ['left', 'rightCat', 'rightNumeric'].includes(self.place)
        ? "vertical" : "horizontal"
    },
    get isUpdatingDynamically() {
      return false
    }
  }))
  .actions(self => ({
    setScale(scale: IScaleType) {
      self.scale = scale
    },
    setTransitionDuration(duration: number) {
      self.transitionDuration = duration
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)

export interface IAxisModel extends Instance<typeof AxisModel> {}
export interface IAxisModelSnapshot extends SnapshotIn<typeof AxisModel> {}

export const EmptyAxisModel = AxisModel
  .named("EmptyAxisModel")
  .props({
    type: types.optional(types.literal("empty"), "empty")
  })
export interface IEmptyAxisModel extends Instance<typeof EmptyAxisModel> {}
export interface IEmptyAxisModelSnapshot extends SnapshotIn<typeof EmptyAxisModel> {}

export function isEmptyAxisModel(axisModel?: IAxisModel): axisModel is IEmptyAxisModel {
  return axisModel?.type === "empty"
}

export const CategoricalAxisModel = AxisModel
  .named("CategoricalAxisModel")
  .props({
    type: types.optional(types.literal("categorical"), "categorical"),
    scale: "band"
  })
export interface ICategoricalAxisModel extends Instance<typeof CategoricalAxisModel> {}
export interface ICategoricalAxisModelSnapshot extends SnapshotIn<typeof CategoricalAxisModel> {}

export function isCategoricalAxisModel(axisModel?: IAxisModel): axisModel is ICategoricalAxisModel {
  return axisModel?.type === "categorical"
}

export const ColorAxisModel = CategoricalAxisModel
  .named("ColorAxisModel")
  .props({
    subType: types.optional(types.literal("color"), "color")
  })
  export interface IColorAxisModel extends Instance<typeof ColorAxisModel> {}
  export interface IColorAxisModelSnapshot extends SnapshotIn<typeof ColorAxisModel> {}

  export function isColorAxisModel(axisModel?: IAxisModel): axisModel is IColorAxisModel {
    return axisModel?.type === "categorical" && axisModel?.subType === "color"
  }

  export function isCategoricalOrColorAxisModel(axisModel?: IAxisModel):
                                  axisModel is ICategoricalAxisModel | IColorAxisModel {
    return isCategoricalAxisModel(axisModel) || isColorAxisModel(axisModel)
  }

export const BaseNumericAxisModel = AxisModel
  .named("BaseNumericAxisModel")
  .props({
    scale: types.optional(types.enumeration([...ScaleTypes]), "linear"),
    min: types.number,
    max: types.number
  })
  .volatile(_self => ({
    dynamicMin: undefined as number | undefined,
    dynamicMax: undefined as number | undefined,
    allowRangeToShrink: false
  }))
  .views(self => ({
    get integersOnly() {
      return false
    },
    get lockZero() {
      return false
    },
    get domain() {
      if (!isAlive(self)) {
        console.warn("AxisModel.domain called for defunct axis model")
        return [0, 1] as const
      }
      return [self.dynamicMin ?? self.min, self.dynamicMax ?? self.max] as const
    },
    get isUpdatingDynamically() {
      return self.dynamicMin != null || self.dynamicMax != null
    }
  }))
  .actions(self => ({
    setDynamicDomain(min: number, max: number) {
      // note: we don't snap to 0 during the drag
      self.dynamicMin = min
      self.dynamicMax = max
    },
    setDomain(min: number, max: number) {
      // If we're close enough to zero on either end, we snap to it
      const snapFactor = 100
      if ((max > 0) && (Math.abs(min) <= max / snapFactor)) {
        min = 0
      } else if ((min < 0) && (Math.abs(max) < Math.abs(min / snapFactor))) {
        max = 0
      }
      if (!self.allowRangeToShrink) {
        const currentMin = self.dynamicMin ?? self.min,
          currentMax = self.dynamicMax ?? self.max
        min = Math.min(min, currentMin)
        max = Math.max(max, currentMax)
      } else {
        self.allowRangeToShrink = false
      }
      if (isFinite(min)) self.min = min
      if (isFinite(max)) self.max = max
      self.dynamicMin = undefined
      self.dynamicMax = undefined
    },
    setMinimum(min: number) {
      if (isFinite(min)) {
        self.min = min
        self.dynamicMin = undefined
      }
    },
    setMaximum(max: number) {
      if (isFinite(max)) {
        self.max = max
        self.dynamicMax = undefined
      }
    },
    setAllowRangeToShrink(allowRangeToShrink: boolean) {
      self.allowRangeToShrink = allowRangeToShrink
    }
  }))

export interface IBaseNumericAxisModel extends Instance<typeof BaseNumericAxisModel> {}
export interface IBaseNumericAxisModelSnapshot extends SnapshotIn<typeof BaseNumericAxisModel> {}

export const NumericAxisModel = BaseNumericAxisModel
  .named("NumericAxisModel")
  .props({
    type: types.optional(types.literal("numeric"), "numeric")
  })
  .views(self => ({
    get minDisplay() {
      return String(self.integersOnly ? Math.round(self.min)
        : chooseDecimalPlaces(self.min, self.min, self.max))
    },
    get maxDisplay() {
      return String(self.integersOnly ? Math.round(self.max)
        : chooseDecimalPlaces(self.max, self.min, self.max))
    }
  }))

export interface INumericAxisModel extends Instance<typeof NumericAxisModel> {}
export interface INumericAxisModelSnapshot extends SnapshotIn<typeof NumericAxisModel> {}

export function isNumericAxisModel(axisModel?: IAxisModel): axisModel is INumericAxisModel {
  return axisModel?.type === "numeric"
}

export const PercentAxisModel = BaseNumericAxisModel
  .named("PercentAxisModel")
  .props({
    type: types.optional(types.literal("percent"), "percent")
  })
  .views(self => ({
    get lockZero() {
      return true
    },
  }))
export interface IPercentAxisModel extends Instance<typeof PercentAxisModel> {}
export interface IPercentAxisModelSnapshot extends SnapshotIn<typeof PercentAxisModel> {}
export function isPercentAxisModel(axisModel?: IAxisModel): axisModel is IPercentAxisModel {
  return axisModel?.type === "percent"
}

// ToDo: It _should_ be possible to have CountAxisModel inherit from PercentAxisModel and get rid of lockZero
//  but it causes a strange typescript error in graph-content-model.ts
export const CountAxisModel = BaseNumericAxisModel
  .named("CountAxisModel")
  .props({
    type: types.optional(types.literal("count"), "count")
  })
  .views(self => ({
    get lockZero() {
      return true
    },
    get integersOnly() {
      return true
    }
  }))
export interface ICountAxisModel extends Instance<typeof CountAxisModel> {}
export interface ICountAxisModelSnapshot extends SnapshotIn<typeof CountAxisModel> {}
export function isCountAxisModel(axisModel?: IAxisModel): axisModel is ICountAxisModel {
  return axisModel?.type === "count"
}

export function isNumericOrCountOrPercentAxisModel(axisModel?: IAxisModel):
    axisModel is INumericAxisModel | ICountAxisModel | IPercentAxisModel {
  return isNumericAxisModel(axisModel) || isCountAxisModel(axisModel) || isPercentAxisModel(axisModel)
}

export const DateAxisModel = BaseNumericAxisModel
  .named("DateAxisModel")
  .props({
    type: types.optional(types.literal("date"), "date"),
  })
  .views(self => ({
    get precisionForDisplay() {
      const levels = determineLevels(self.min, self.max)
      return mapLevelToPrecision(levels.innerLevel + 1)
    },
    get minDisplay() {
      return String(formatDate(self.min * 1000, this.precisionForDisplay))
    },
    get maxDisplay() {
      return String(formatDate(self.max * 1000, this.precisionForDisplay))
    }
  }))
export interface IDateAxisModel extends Instance<typeof DateAxisModel> {}
export interface IDateAxisModelSnapshot extends SnapshotIn<typeof DateAxisModel> {}

export function isDateAxisModel(axisModel?: IAxisModel): axisModel is IDateAxisModel {
  return axisModel?.type === "date"
}

export function isBaseNumericAxisModel(axisModel?: IAxisModel): axisModel is INumericAxisModel | IDateAxisModel {
  return isNumericAxisModel(axisModel) || isCountAxisModel(axisModel) || isPercentAxisModel(axisModel) ||
    isDateAxisModel(axisModel)
}

export const AxisModelUnion =
  types.union(EmptyAxisModel, CategoricalAxisModel, ColorAxisModel,
              NumericAxisModel, CountAxisModel, PercentAxisModel, DateAxisModel)
export type IAxisModelUnion =
  IEmptyAxisModel | ICategoricalAxisModel | IColorAxisModel |
  INumericAxisModel | ICountAxisModel | IPercentAxisModel | IDateAxisModel
export type IAxisModelSnapshotUnion = IEmptyAxisModelSnapshot |
  ICategoricalAxisModelSnapshot | IColorAxisModelSnapshot |
  INumericAxisModelSnapshot | ICountAxisModelSnapshot | IPercentAxisModelSnapshot | IDateAxisModelSnapshot


export function isAxisModelInUnion(model: IAxisModel): model is IAxisModelUnion {
  return isEmptyAxisModel(model) || isCategoricalAxisModel(model) || isColorAxisModel(model) ||
          isNumericAxisModel(model) || isCountAxisModel(model) || isPercentAxisModel(model) || isDateAxisModel(model)
}
