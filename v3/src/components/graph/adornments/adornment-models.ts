/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */

import {Instance, types} from "mobx-state-tree"
import {typedId} from "../../../utilities/js-utils"
import {Point} from "../graphing-types"

export const PointModel = types.model("Point", {
  x: types.optional(types.number, NaN),
  y: types.optional(types.number, NaN)
})
  .views(self=>({
    isValid() {
      return isFinite(self.x) && isFinite(self.y)
    }
  }))
  .actions(self => ({
    set(aPt:Point) {
      if (aPt) {
        self.x = aPt.x
        self.y = aPt.y
      }
    }
  }))
export interface IPointModel extends Instance<typeof PointModel> {}
export const kInfinitePoint = {x:NaN, y:NaN}

const Adornment = types.model("Adornment", {
  id: types.optional(types.identifier, () => typedId("ADRN")),
  type: types.optional(types.string, () => {
    throw "type must be overridden"
  }),
  isVisible: true
})
  .actions(self => ({
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))

export const MovableValueModel = Adornment
  .named('MovableValueModel')
  .props({
    type: 'value',
    value: types.number,
  })
  .actions(self => ({
    setValue(aValue: number) {
      self.value = aValue
    }
  }))
export interface IMovableValueModel extends Instance<typeof MovableValueModel> {}

export const MovableLineModel = Adornment
  .named('MovableLineModel')
  .props({
    type: 'line',
    intercept: types.number,
    slope: types.number,
    pivot1: types.optional(PointModel, kInfinitePoint),
    pivot2: types.optional(PointModel, kInfinitePoint)
  })
  .actions(self => ({
    setLine(aLine: {intercept:number, slope:number, pivot1?:Point, pivot2?:Point}) {
      self.intercept = aLine.intercept
      self.slope = aLine.slope
        self.pivot1.set(aLine.pivot1 ?? kInfinitePoint)
        self.pivot2.set(aLine.pivot2 ?? kInfinitePoint)
    },
    setPivot1(aPoint: Point) {
      self.pivot1.set(aPoint)
    },
    setPivot2(aPoint: Point) {
      self.pivot2.set(aPoint)
    }
  }))
export interface IMovableLineModel extends Instance<typeof MovableLineModel> {}

export const AdornmentModelUnion = types.union(MovableValueModel, MovableLineModel)
export type IAdornmentModelUnion = IMovableValueModel | IMovableLineModel
