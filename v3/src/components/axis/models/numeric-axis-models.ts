import { Instance, SnapshotIn } from "mobx-state-tree"
import { determineLevels, formatDate, mapLevelToPrecision } from "../../../utilities/date-utils"
import { chooseDecimalPlaces } from "../../../utilities/math-utils"
import { axisModelType, IAxisModel, registerAxisModel } from "./axis-model"
import { BaseNumericAxisModel } from "./base-numeric-axis-model"

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
