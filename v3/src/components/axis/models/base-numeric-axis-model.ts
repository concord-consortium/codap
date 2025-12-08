import { Instance, isAlive, SnapshotIn, types } from "mobx-state-tree"
import { ScaleTypes } from "../axis-types"
import { AxisModel } from "./axis-model"

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
