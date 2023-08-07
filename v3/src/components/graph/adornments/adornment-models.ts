/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */

import {Instance, types} from "mobx-state-tree"
import { IAxisModel } from "../../axis/models/axis-model"
import {safeDomIdentifier, typedId} from "../../../utilities/js-utils"
import {Point} from "../../data-display/data-display-types"
import {IGraphDataConfigurationModel} from "../models/graph-data-configuration-model"

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
export const kInfinitePoint = {x:NaN, y:NaN}

export interface IUpdateCategoriesOptions {
  xAxis?: IAxisModel
  xAttrId: string
  xCats: string[]
  yAxis?: IAxisModel
  yAttrId: string
  yCats: string[]
  topCats: string[]
  topAttrId: string
  rightCats: string[]
  rightAttrId: string
  resetPoints?: boolean
  dataConfig?: IGraphDataConfigurationModel
}

export const AdornmentModel = types.model("AdornmentModel", {
    id: types.optional(types.identifier, () => typedId("ADRN")),
    type: types.optional(types.string, () => {
      throw "type must be overridden"
    }),
    isVisible: true
  })
  .views(self => ({
    instanceKey(cellKey: Record<string, string>) {
      return JSON.stringify(cellKey)
    },
    classNameFromKey(cellKey: Record<string, string>) {
      let className = ""
      Object.entries(cellKey).forEach(([key, value]) => {
        const valueNoSpaces = safeDomIdentifier(value)
        className += `${className ? "-" : ""}${key}-${valueNoSpaces}`
      })
      return className
    },
    get isUnivariateMeasure() {
      return false
    },
    cellKey(options: IUpdateCategoriesOptions, index: number) {
      const { xAttrId, xCats, yAttrId, yCats, topAttrId, topCats, rightAttrId, rightCats } = options
      const topCatCount = topCats.length || 1
      const rightCatCount = rightCats.length || 1
      const yCatCount = yCats.length || 1
      const xCatCount = xCats.length || 1
      const columnCount = topCatCount * xCatCount
      const rowCount = rightCatCount * yCatCount
      const cellKey: Record<string, string> = {}

      // Determine which categories are associated with the cell's axes using the provided index value and
      // the attributes and categories present in the graph.      
      const topIndex = xCatCount > 0
        ? Math.floor(index / xCatCount) % topCatCount
        : index % topCatCount
      const topCat = topCats[topIndex]
      const rightIndex = topCatCount > 0 && yCatCount > 1
        ? Math.floor(index / (topCatCount * yCatCount)) % rightCatCount
        : yCatCount > 0
          ? Math.floor(index / yCatCount) % rightCatCount
          : index % rightCatCount
      const rightCat = rightCats[rightIndex]
      const yCat = topCats.length > 0
        ? yCats[Math.floor(index / columnCount) % yCatCount]
        : yCats[index % yCats.length]
      const xCat = rightCats.length > 0
        ? xCats[Math.floor(index / rowCount) % xCatCount]
        : xCats[index % xCats.length]

      // Assign the categories determined above to the associated properties of the cellKey object.
      if (topAttrId) cellKey[topAttrId] = topCat
      if (rightAttrId) cellKey[rightAttrId] = rightCat
      if (yAttrId && yCats[0]) cellKey[yAttrId] = yCat
      if (xAttrId && xCats[0]) cellKey[xAttrId] = xCat

      return cellKey
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
