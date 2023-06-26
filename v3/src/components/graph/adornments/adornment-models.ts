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
    type: 'Movable Value',
    value: types.number,
  })
  .actions(self => ({
    setValue(aValue: number) {
      self.value = aValue
    }
  }))
export interface IMovableValueModel extends Instance<typeof MovableValueModel> {}

export const MovableLineParams = types.model("MovableLineParams", {
  intercept: types.number,
  slope: types.number,
  pivot1: types.optional(PointModel, kInfinitePoint),
  pivot2: types.optional(PointModel, kInfinitePoint),
})

export const MovableLineModel = Adornment
  .named('MovableLineModel')
  .props({
    type: 'Movable Line',
    lines: types.map(MovableLineParams)
  })
  .volatile(self => ({
    pivot1: PointModel.create(),
    pivot2: PointModel.create()
  }))
  .actions(self => ({
    setLine(aLine: {intercept:number, slope:number, pivot1?:Point, pivot2?:Point}, key='') {
      self.lines.set(key, aLine)
      self.pivot1.set(aLine.pivot1 ?? kInfinitePoint)
      self.pivot2.set(aLine.pivot2 ?? kInfinitePoint)
    }
  }))
export interface IMovableLineModel extends Instance<typeof MovableLineModel> {}

export const AdornmentModelUnion = types.union(MovableValueModel, MovableLineModel)
export type IAdornmentModelUnion = IMovableValueModel | IMovableLineModel
