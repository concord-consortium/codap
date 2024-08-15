import {Instance, SnapshotIn, isAlive, types} from "mobx-state-tree"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {AxisOrientation, AxisPlaces, IScaleType, ScaleTypes} from "../axis-types"

export const AxisModel = types.model("AxisModel", {
  type: types.optional(types.string, () => {
    throw "type must be overridden"
  }),
  place: types.enumeration([...AxisPlaces]),
  scale: types.optional(types.enumeration([...ScaleTypes]), "ordinal"),
})
  .volatile(self => ({
    transitionDuration: 0
  }))
  .views(self => ({
    get orientation(): AxisOrientation {
      return ['left', 'rightCat', 'rightNumeric'].includes(self.place)
        ? "vertical" : "horizontal"
    },
    get isNumeric() {
      return self.type === "numeric"
    },
    get isCategorical() {
      return self.type === "categorical"
    },
    get isDate() {
      return self.type === "date"
    },
    get isAbstractNumeric() {
      return this.isNumeric || this.isDate
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

export interface IAxisModel extends Instance<typeof AxisModel> {
}

export const EmptyAxisModel = AxisModel
  .named("EmptyAxisModel")
  .props({
    type: types.optional(types.literal("empty"), "empty"),
    min: 0,
    max: 0
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
  return !!axisModel?.isCategorical
}

export const BaseNumericAxisModel = AxisModel
  .named("BaseNumericAxisModel")
  .props({
    scale: types.optional(types.enumeration([...ScaleTypes]), "linear"),
    lockZero: false,
    min: types.number,
    max: types.number
  })
  .volatile(_self => ({
    dynamicMin: undefined as number | undefined,
    dynamicMax: undefined as number | undefined
  }))
  .views(self => ({
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
      self.min = min
      self.max = max
      self.dynamicMin = undefined
      self.dynamicMax = undefined
    },
    setLockZero(lockZero: boolean) {
      self.lockZero = lockZero
    }
  }))

export interface IBaseNumericAxisModel extends Instance<typeof BaseNumericAxisModel> {}
export interface IBaseNumericAxisModelSnapshot extends SnapshotIn<typeof BaseNumericAxisModel> {}

export function isBaseNumericAxisModel(axisModel?: IAxisModel): axisModel is IBaseNumericAxisModel {
  return !!axisModel?.isAbstractNumeric
}

export const NumericAxisModel = BaseNumericAxisModel
  .named("NumericAxisModel")
  .props({
    type: types.optional(types.literal("numeric"), "numeric"),
  })

export interface INumericAxisModel extends Instance<typeof NumericAxisModel> {}
export interface INumericAxisModelSnapshot extends SnapshotIn<typeof NumericAxisModel> {}

export function isNumericAxisModel(axisModel?: IAxisModel): axisModel is INumericAxisModel {
  return !!axisModel?.isNumeric
}

export const DateAxisModel = BaseNumericAxisModel
  .named("DateAxisModel")
  .props({
    type: types.optional(types.literal("date"), "date"),
  })
export interface IDateAxisModel extends Instance<typeof DateAxisModel> {}
export interface IDateAxisModelSnapshot extends SnapshotIn<typeof DateAxisModel> {}

export function isDateAxisModel(axisModel?: IAxisModel): axisModel is IDateAxisModel {
  return !!axisModel?.isDate
}

export const AxisModelUnion = types.union(EmptyAxisModel, CategoricalAxisModel, NumericAxisModel, DateAxisModel)
export type IAxisModelUnion = IEmptyAxisModel | ICategoricalAxisModel | INumericAxisModel | IDateAxisModel
export type IAxisModelSnapshotUnion =
  IEmptyAxisModelSnapshot | ICategoricalAxisModelSnapshot | INumericAxisModelSnapshot | IDateAxisModelSnapshot
