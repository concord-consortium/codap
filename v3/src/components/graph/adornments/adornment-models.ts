/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */

import {Instance, types} from "mobx-state-tree"
import {typedId} from "../../../utilities/js-utils"
import {Point, kMovableLineType} from "../graphing-types"

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

export const AdornmentModel = types.model("AdornmentModel", {
    id: types.optional(types.identifier, () => typedId("ADRN")),
    type: types.optional(types.string, () => {
      throw "type must be overridden"
    }),
    isVisible: true
  })
  .views(self => ({
    setInstanceKey(xCats: string[] | number[], yCats: string[] | number[], index: number) {
      if ((xCats.length === 0 && yCats.length === 0) || xCats[index] === '') {
        return ''
      } else if (xCats.length > 0 &&  yCats.length > 0) {
        return `{x: ${xCats[index % xCats.length]}, y: ${yCats[Math.floor(index / xCats.length)]}}`
      } else if (xCats.length > 0) {
        return `{x: ${xCats[index]}}`
      } else if (yCats.length > 0) {
        return `{y: ${yCats[index]}}`
      }
    },
    setClassNameFromKey(key: string) {
      const className = key.replace(/\{/g, '')
        .replace(/\}/g, '')
        .replace(/: /g, '-')
        .replace(/, /g, '-')

      return className
    }
  }))
  .actions(self => ({
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    }
  }))
export interface IAdornmentModel extends Instance<typeof AdornmentModel> {}

export const MovableValueModel = AdornmentModel
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
  })
  .volatile(self => ({
    pivot1: PointModel.create(),
    pivot2: PointModel.create()
  }))
  .actions(self => ({
    setPivot1(point: Point) {
      self.pivot1.set(point)
    },
    setPivot2(point: Point) {
      self.pivot2.set(point)
    }
  }))

export const MovableLineModel = AdornmentModel
  .named('MovableLineModel')
  .props({
    type: 'Movable Line',
    lines: types.map(MovableLineParams)
  })
  .actions(self => ({
    setLine(aLine: {intercept: number, slope: number, pivot1?: Point, pivot2?: Point}, key='') {
      self.lines.set(key, aLine)
      const line = self.lines.get(key)
      line?.setPivot1(aLine.pivot1 ?? kInfinitePoint)
      line?.setPivot2(aLine.pivot2 ?? kInfinitePoint)
    }
  }))
export interface IMovableLineModel extends Instance<typeof MovableLineModel> {}
export function isMovableLine(adornment: IAdornmentModel): adornment is IMovableLineModel {
  return adornment.type === kMovableLineType
}

export const AdornmentModelUnion = types.union(MovableValueModel, MovableLineModel)
export type IAdornmentModelUnion = IMovableValueModel | IMovableLineModel
