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
  dataConfig: IGraphDataConfigurationModel
  interceptLocked?: boolean
  resetPoints?: boolean
  xAxis?: IAxisModel
  yAxis?: IAxisModel
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
      const xCatValues = layout.getAxisMultiScale("bottom")?.categoryValues
      const xCats = xAttrType === "categorical" && xCatValues ? xCatValues : [""]
      const yCatValues = layout.getAxisMultiScale("left")?.categoryValues
      const yCats = yAttrType === "categorical" && yCatValues ? yCatValues : [""]
      const xCellCount = xCats.length * xSubAxesCount
      const yCellCount = yCats.length * ySubAxesCount
      return {x: xCellCount, y: yCellCount}
    },
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
