/*
  Adornment models are strictly MST. They keep track of the user modifications of the defaults.
 */
import {Instance, SnapshotIn, types} from "mobx-state-tree"
import { applyModelChange } from "../../../models/history/apply-model-change"
import {safeDomIdentifier, typedId} from "../../../utilities/js-utils"
import { ScaleNumericBaseType } from "../../axis/axis-types"
import { IAxisLayout } from "../../axis/models/axis-layout-context"
import { IAxisModel } from "../../axis/models/axis-model"
import {IGraphDataConfigurationModel} from "../models/graph-data-configuration-model"
import { cellKeyToString } from "../utilities/cell-key-utils"

export interface IUpdateCategoriesOptions {
  dataConfig: IGraphDataConfigurationModel
  interceptLocked?: boolean
  addMovableValue?: boolean
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
      return cellKeyToString(cellKey)
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
    get labelLines() {
      // derived models should override if they show measure labels
      return 0
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
  .actions(applyModelChange)
export interface IAdornmentModel extends Instance<typeof AdornmentModel> {}
export interface IAdornmentModelSnapshot extends SnapshotIn<typeof AdornmentModel> {}

export const UnknownAdornmentModel = AdornmentModel
  .named("UnknownAdornmentModel")
  .props({
    type: "Unknown"
  })
export interface IUnknownAdornmentModel extends Instance<typeof UnknownAdornmentModel> {}

export function isUnknownAdornmentModel(adornmentModel: IAdornmentModel): adornmentModel is IUnknownAdornmentModel {
  return adornmentModel.type === "Unknown"
}
