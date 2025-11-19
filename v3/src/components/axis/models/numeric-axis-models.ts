import { Instance, isAlive, SnapshotIn, types } from "mobx-state-tree"
import { determineLevels, formatDate, mapLevelToPrecision } from "../../../utilities/date-utils"
import { chooseDecimalPlaces } from "../../../utilities/math-utils"
import { ScaleTypes } from "../axis-types"
import { AxisModel, axisModelType, IAxisModel, registerAxisModel } from "./axis-model"

/*
 * BaseNumericAxisModel (abstract)
 */
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
    // Note that if a subclass (such as QualitativeAxisModel) has a fixed domain, it can override setDomain,
    // setMinimum, and setMaximum to do nothing.
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

/*
 * NumericAxisModel
 */
export const NumericAxisModel = BaseNumericAxisModel
  .named("NumericAxisModel")
  .props({
    type: axisModelType("numeric")
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

registerAxisModel("numeric", NumericAxisModel)

/*
 * QualitativeAxisModel
 */
export const QualitativeAxisModel = BaseNumericAxisModel
  .named("QualitativeAxisModel")
  .props({
    type: axisModelType("qualitative")
  })
  .actions(self => ({
    setDomain() {
      // Domain of a qualitative axis cannot be changed
    },
    setMinimum() {
      // min of a qualitative axis cannot be changed
    },
    setMaximum() {
      // max of a qualitative axis cannot be changed
    }
  }))
export interface IQualitativeAxisModel extends Instance<typeof QualitativeAxisModel> {}
export interface IQualitativeAxisModelSnapshot extends SnapshotIn<typeof QualitativeAxisModel> {}

export function isQualitativeAxisModel(axisModel?: IAxisModel): axisModel is IQualitativeAxisModel {
  return axisModel?.type === "qualitative"
}

registerAxisModel("qualitative", QualitativeAxisModel)

/*
 * ZeroLockedAxisModel (abstract)
 */
export const ZeroLockedAxisModel = BaseNumericAxisModel
  .named("ZeroLockedAxisModel")
  .views(self => ({
    get lockZero() {
      return true
    },
  }))
export interface IZeroLockedAxisModel extends Instance<typeof ZeroLockedAxisModel> {}
export interface IZeroLockedAxisModelSnapshot extends SnapshotIn<typeof ZeroLockedAxisModel> {}

/*
 * CountAxisModel
 */
export const CountAxisModel = ZeroLockedAxisModel
  .named("CountAxisModel")
  .props({
    type: axisModelType("count")
  })
  .views(self => ({
    get integersOnly() {
      return true
    }
  }))
export interface ICountAxisModel extends Instance<typeof CountAxisModel> {}
export interface ICountAxisModelSnapshot extends SnapshotIn<typeof CountAxisModel> {}

export function isCountAxisModel(axisModel?: IAxisModel): axisModel is ICountAxisModel {
  return axisModel?.type === "count"
}

registerAxisModel("count", CountAxisModel)

/*
 * PercentAxisModel
 */
export const PercentAxisModel = ZeroLockedAxisModel
  .named("PercentAxisModel")
  .props({
    type: axisModelType("percent")
  })
export interface IPercentAxisModel extends Instance<typeof PercentAxisModel> {}
export interface IPercentAxisModelSnapshot extends SnapshotIn<typeof PercentAxisModel> {}

export function isPercentAxisModel(axisModel?: IAxisModel): axisModel is IPercentAxisModel {
  return axisModel?.type === "percent"
}

registerAxisModel("percent", PercentAxisModel)

/*
 * DateAxisModel
 */
export const DateAxisModel = BaseNumericAxisModel
  .named("DateAxisModel")
  .props({
    type: axisModelType("date")
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

registerAxisModel("date", DateAxisModel)

/*
 * utilities
 */
export type INonDateNumericAxisModel = INumericAxisModel | ICountAxisModel | IPercentAxisModel
export function isNonDateNumericAxisModel(axisModel?: IAxisModel): axisModel is INonDateNumericAxisModel {
  return !!axisModel && ["numeric", "count", "percent"].includes(axisModel.type)
}

export type IAnyNumericAxisModel = INumericAxisModel | ICountAxisModel | IPercentAxisModel | IDateAxisModel
export function isAnyNumericAxisModel(axisModel?: IAxisModel): axisModel is IAnyNumericAxisModel {
  return !!axisModel && ["numeric", "count", "percent", "date", "qualitative"].includes(axisModel.type)
}
