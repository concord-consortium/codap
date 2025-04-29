import {Instance, types} from "mobx-state-tree"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {defaultPointColor, defaultStrokeColor, kellyColors} from "../../../utilities/color-utils"
import { set } from "lodash"

export const DisplayItemDescriptionModel = types
  .model("PointDescriptionModel", {
    _itemColors: types.optional(types.array(types.string), [defaultPointColor]),
    _itemStrokeColor: defaultStrokeColor,
    _itemStrokeSameAsFill: false,
    _pointSizeMultiplier: 1, // Not used when item is a polygon in which case it is set to -1
    _pointAsRect: types.optional(types.boolean,false), // Default shape
  })
  .volatile(() => ({
    _dynamicPointSizeMultiplier: undefined as number | undefined  // Used during slider drag
  }))
  .actions(self => ({
    setPointColor(color: string, plotIndex = 0) {
      self._itemColors[plotIndex] = color
    },
    setPointStrokeColor(color: string) {
      self._itemStrokeColor = color
    },
    setPointStrokeSameAsFill(isSame: boolean) {
      self._itemStrokeSameAsFill = isSame
    },
    setPointSizeMultiplier(multiplier: number) {
      self._pointSizeMultiplier = multiplier
      self._dynamicPointSizeMultiplier = undefined
    },
    setDynamicPointSizeMultiplier(multiplier: number) {
      self._dynamicPointSizeMultiplier = multiplier
    },
    setPointAsRect(rect: boolean) {
      self._pointAsRect = rect
    }
  }))
  .views(self => ({
    get pointSizeMultiplier() {
      return self._dynamicPointSizeMultiplier ?? self._pointSizeMultiplier
    },
    itemColorAtIndex(plotIndex = 0) {
      return self._itemColors[plotIndex] ?? kellyColors[plotIndex % kellyColors.length]
    },
    get itemColor() {
      return this.itemColorAtIndex(0)
    },
    get itemStrokeColor() {
      return self._itemStrokeSameAsFill ? this.itemColor : self._itemStrokeColor
    },
    get itemStrokeSameAsFill() {
      return self._itemStrokeSameAsFill
    },
    get pointAsRect() {
      return self._pointAsRect
    },
  }))
  .views(self => ({
    // Convenience methods referring to points, especially for use by graphs
    pointColorAtIndex(plotIndex = 0) {
      return self.itemColorAtIndex(plotIndex)
    },
    get pointColor() {
      return self.itemColor
    },
    get pointStrokeColor() {
      return self.itemStrokeColor
    },
    get pointStrokeSameAsFill() {
      return self.itemStrokeSameAsFill
    },
    get pointAsRect() {
      return self._pointAsRect
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)

export interface IDisplayItemDescriptionModel extends Instance<typeof DisplayItemDescriptionModel> {
}
