/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */

import {Instance, types} from "mobx-state-tree"
import { IAxisModel } from "../../axis/models/axis-model"
import {safeDomIdentifier, typedId} from "../../../utilities/js-utils"
import {Point} from "../../data-display/data-display-types"
import {IGraphDataConfigurationModel} from "../models/graph-data-configuration-model"
import { IAxisLayout } from "../../axis/models/axis-layout-context"
import { ScaleNumericBaseType } from "../../axis/axis-types"
import { updateCellKey } from "./adornment-utils"

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
  xScale?: ScaleNumericBaseType
  yScale?: ScaleNumericBaseType
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
    cellCount(layout: IAxisLayout, xAttrType?: string, yAttrType?: string) {
      const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
      const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1
      const xCatSet = layout.getAxisMultiScale("bottom")?.categorySet
      const xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""]
      const yCatSet = layout.getAxisMultiScale("left")?.categorySet
      const yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""]
      const xCellCount = xCats.length * xSubAxesCount
      const yCellCount = yCats.length * ySubAxesCount
      return {x: xCellCount, y: yCellCount}
    },
    cellKey(options: IUpdateCategoriesOptions, index: number) {
      const { xAttrId, xCats, yAttrId, yCats, topAttrId, topCats, rightAttrId, rightCats } = options
      const rightCatCount = rightCats.length || 1
      const yCatCount = yCats.length || 1
      const xCatCount = xCats.length || 1
      let cellKey: Record<string, string> = {}

      // Determine which categories are associated with the cell's axes using the provided index value and
      // the attributes and categories present in the graph.
      const topIndex = Math.floor(index / (rightCatCount * yCatCount * xCatCount))
      const topCat = topCats[topIndex]
      cellKey = updateCellKey(cellKey, topAttrId, topCat)
      const rightIndex = Math.floor(index / (yCatCount * xCatCount)) % rightCatCount
      const rightCat = rightCats[rightIndex]
      cellKey = updateCellKey(cellKey, rightAttrId, rightCat)
      const yCat = yCats[index % yCatCount]
      cellKey = updateCellKey(cellKey, yAttrId, yCat)
      const xCat = xCats[index % xCatCount]
      cellKey = updateCellKey(cellKey, xAttrId, xCat)

      return cellKey
    }
  }))
  .views(self => ({
    getAllCellKeys(options: IUpdateCategoriesOptions) {
      const { xCats, yCats, topCats, rightCats } = options
      const topCatCount = topCats.length || 1
      const rightCatCount = rightCats.length || 1
      const xCatCount = xCats.length || 1
      const yCatCount = yCats.length || 1
      const columnCount = topCatCount * xCatCount
      const rowCount = rightCatCount * yCatCount
      const totalCount = rowCount * columnCount
      const cellKeys: Record<string, string>[] = []
      for (let i = 0; i < totalCount; ++i) {
        cellKeys.push(self.cellKey(options, i))
      }
      return cellKeys
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
