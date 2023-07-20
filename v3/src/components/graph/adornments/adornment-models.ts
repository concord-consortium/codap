/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */

import {Instance, types} from "mobx-state-tree"
import { IAxisModel, isNumericAxisModel } from "../../axis/models/axis-model"
import {typedId} from "../../../utilities/js-utils"
import {Point} from "../graphing-types"
import { kMovableLineType } from "./movable-line/movable-line-types"
import { kMovablePointType } from "./movable-point/movable-point-types"
import { kMovableValueType } from "./movable-value/movable-value-types"

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

export interface IUpdateCategoriesOptions {
  xAxis?: IAxisModel
  yAxis?: IAxisModel
  xCategories: string[]
  yCategories: string[]
}

export const AdornmentModel = types.model("AdornmentModel", {
    id: types.optional(types.identifier, () => typedId("ADRN")),
    type: types.optional(types.string, () => {
      throw "type must be overridden"
    }),
    isVisible: true
  })
  .views(self => ({
    instanceKey(xCats: string[] | number[], yCats: string[] | number[], index: number) {
      if (xCats.length > 0 && yCats.length > 0) {
        return `{x: ${xCats[index % xCats.length]}, y: ${yCats[Math.floor(index / xCats.length)]}}`
      } else if (xCats.length > 0) {
        return `{x: ${xCats[index]}}`
      } else if (yCats.length > 0) {
        return `{y: ${yCats[index]}}`
      }
      return ''
    },
    classNameFromKey(key: string) {
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
    },
    updateCategories(options: IUpdateCategoriesOptions) {
      // derived models should override to update their models when categories change
    }
  }))
export interface IAdornmentModel extends Instance<typeof AdornmentModel> {}

export const UnknownAdornmentModel = AdornmentModel
  .named("UnknownAdornmentModel")
  .props({
    type: "Unknown"
  })
export interface IUnknownAdornmentModel extends Instance<typeof UnknownAdornmentModel> {}

export function isUnknownAdornmentModel(adornmentModel: IAdornmentModel): adornmentModel is IUnknownAdornmentModel {
  return adornmentModel.type === "Unknown"
}

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
export function isMovableValue(adornment: IAdornmentModel): adornment is IMovableValueModel {
  return adornment.type === kMovableValueType
}

export const MovableLineParams = types.model("MovableLineParams", {
    equationCoords: types.maybe(PointModel),
    intercept: types.number,
    slope: types.number,
  })
  .volatile(self => ({
    pivot1: PointModel.create(),
    pivot2: PointModel.create()
  }))
  .actions(self => ({
    setEquationCoords(coords: Point) {
      self.equationCoords = PointModel.create(coords)
    },
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
    setLine(
      aLine: {intercept: number, slope: number, pivot1?: Point, pivot2?: Point, equationCoords?: Point}, key=''
    ) {
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

export const MovablePointModel = AdornmentModel
  .named('MovablePointModel')
  .props({
    type: 'Movable Point',
    points: types.map(PointModel)
  })
  .views(self => ({
    getInitialPosition(axis?: IAxisModel) {
      if (!isNumericAxisModel(axis)) return 0
      const [min, max] = axis.domain
      return max - (max - min) / 4
    }
  }))
  .actions(self => ({
    setPoint(aPoint: Point, key='') {
      self.points.set(key, aPoint)
    }
  }))
  .actions(self => ({
    setInitialPoint(xAxis?: IAxisModel, yAxis?: IAxisModel, key='') {
      self.setPoint({ x: self.getInitialPosition(xAxis), y: self.getInitialPosition(yAxis) }, key)
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      const { xAxis, yAxis, xCategories, yCategories } = options
      const columnCount = xCategories?.length || 1
      const rowCount = yCategories?.length || 1
      const totalCount = rowCount * columnCount
      for (let i = 0; i < totalCount; ++i) {
        const instanceKey = self.instanceKey(xCategories, yCategories, i)
        if (!self.points.get(instanceKey)) {
          self.setInitialPoint(xAxis, yAxis, instanceKey)
        }
      }
    }
  }))
export interface IMovablePointModel extends Instance<typeof MovablePointModel> {}
export function isMovablePoint(adornment: IAdornmentModel): adornment is IMovablePointModel {
  return adornment.type === kMovablePointType
}

const adornmentTypeDispatcher = (adornmentSnap: IAdornmentModel) => {
  switch (adornmentSnap.type) {
    case "Movable Line": return MovableLineModel
    case "Movable Point": return MovablePointModel
    case "Movable Value": return MovableValueModel
    default: return UnknownAdornmentModel
  }
}

export const AdornmentModelUnion = types.union({ dispatcher: adornmentTypeDispatcher },
  MovableValueModel, MovableLineModel, MovablePointModel, UnknownAdornmentModel)
export type IAdornmentModelUnion = IMovableValueModel | IMovableLineModel | IMovablePointModel | IUnknownAdornmentModel
