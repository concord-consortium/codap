/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */

import {Instance, types} from "mobx-state-tree"
import { IAxisModel } from "../../axis/models/axis-model"
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

export interface IUpdateCategoriesOptions {
  xAxis?: IAxisModel
  xAttrId: string
  xCats: string[]
  yAxis?: IAxisModel
  yAttrId: string
  yCats: string[]
  topSplitCats: string[]
  topSplitAttrId: string
  rightSplitCats: string[]
  rightSplitAttrId: string
  resetPoints?: boolean
}

export const AdornmentModel = types.model("AdornmentModel", {
    id: types.optional(types.identifier, () => typedId("ADRN")),
    type: types.optional(types.string, () => {
      throw "type must be overridden"
    }),
    isVisible: true
  })
  .views(self => ({
    instanceKey(subPlotKey: Record<string, string>) {
      const key = Object.keys(subPlotKey).length > 0 ? JSON.stringify(subPlotKey) : ""
      return key
    },
    classNameFromKey(subPlotKey: Record<string, string>) {
      let className = ''
      Object.entries(subPlotKey).forEach(([key, value]) => {
        className += `${key}-${value}-`
      })
      return className
    }
  }))
  .actions(self => ({
    setVisibility(isVisible: boolean) {
      self.isVisible = isVisible
    },
    updateCategories(options: IUpdateCategoriesOptions) {
      // derived models should override to update their models when categories change
    },
    setSubPlotKey(options: IUpdateCategoriesOptions, index: number) {
      const { xAttrId, xCats, yAttrId, yCats, topSplitAttrId, topSplitCats, rightSplitAttrId, rightSplitCats } = options
      const subPlotKey: Record<string, string> = {}
      if (topSplitAttrId) subPlotKey[topSplitAttrId] = topSplitCats?.[index % topSplitCats.length]
      if (rightSplitAttrId) subPlotKey[rightSplitAttrId] = rightSplitCats?.[Math.floor(index / topSplitCats.length)]
      if (yAttrId) subPlotKey[yAttrId] = yCats?.[index % yCats.length]
      if (xAttrId) subPlotKey[xAttrId] = xCats?.[index % xCats.length]
      return subPlotKey
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
