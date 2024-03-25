import {Instance, types} from "mobx-state-tree"
import {applyUndoableAction} from "../../../models/history/apply-undoable-action"
import {defaultPointColor, defaultStrokeColor, kellyColors} from "../../../utilities/color-utils"

export const DisplayItemDescriptionModel = types
  .model("PointDescriptionModel", {
    _itemColors: types.optional(types.array(types.string), [defaultPointColor]),
    _itemStrokeColor: defaultStrokeColor,
    _itemStrokeSameAsFill: false,
    pointSizeMultiplier: 1, // Not used when item is a polygon in which case it is set to -1
  })
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
      self.pointSizeMultiplier = multiplier
    }
  }))
  .views(self => ({
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
    }

  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyUndoableAction)

export interface IDisplayItemDescriptionModel extends Instance<typeof DisplayItemDescriptionModel> {
}
