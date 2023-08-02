/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */

import {Instance, types} from "mobx-state-tree"
import { IAxisModel } from "../../axis/models/axis-model"
import {typedId} from "../../../utilities/js-utils"
import {Point} from "../../data-display/data-display-types"

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
  yAxis?: IAxisModel
  xCategories: string[]
  yCategories: string[]
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
      return key.replace(/\{/g, '')
        .replace(/\}/g, '')
        .replace(/: /g, '-')
        .replace(/, /g, '-')
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
