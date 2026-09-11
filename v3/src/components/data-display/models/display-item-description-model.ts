import {Instance, types} from "mobx-state-tree"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {defaultPointColor, defaultStrokeColor, kellyColors} from "../../../utilities/color-utils"
import {kDefaultPointShape, PointShape, pointShapeOrDefault} from "../../../utilities/point-shape-utils"

export const DisplayItemDescriptionModel = types
  .model("DisplayItemDescriptionModel", {
    _itemColors: types.optional(types.array(types.string), [defaultPointColor]),
    /*
     * The shape used when no legend attribute assigns one per category. Scalar rather than an
     * array like _itemColors: color varies per plot index for multi-y plots, shape does not.
     *
     * `maybe` rather than `optional` with a default, so the default is stored as absence and a
     * document that never used shapes does not gain the field when it is opened and saved. That
     * matches how per-category shapes are stored, and the getter below resolves the absence.
     */
    _itemShape: types.maybe(types.string),
    _itemStrokeColor: defaultStrokeColor,
    _itemStrokeSameAsFill: false,
    _pointSizeMultiplier: 1, // Not used when item is a polygon in which case it is set to -1
    pointsHaveBeenReduced: false // Used in conjunction with connecting line point reduction
  })
  .volatile(() => ({
    _dynamicPointSizeMultiplier: undefined as number | undefined  // Used during slider drag
  }))
  .actions(self => ({
    setPointColor(color: string, plotIndex = 0) {
      self._itemColors[plotIndex] = color
    },
    setPointShape(shape: PointShape) {
      // Absence means the default, as it does for a category's shape.
      self._itemShape = shape === kDefaultPointShape ? undefined : shape
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
    setPointsHaveBeenReduced(reduced: boolean) {
      self.pointsHaveBeenReduced = reduced
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
    get itemShape(): PointShape {
      return pointShapeOrDefault(self._itemShape)
    },
    get itemStrokeColor() {
      return self._itemStrokeSameAsFill ? this.itemColor : self._itemStrokeColor
    },
    get itemStrokeSameAsFill() {
      return self._itemStrokeSameAsFill
    },
    // A polygon layer marks itself by setting a negative point size, since it has no point to size.
    get isPolygon() {
      return this.pointSizeMultiplier < 0
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
    get pointShape(): PointShape {
      return self.itemShape
    },
    get pointStrokeColor() {
      return self.itemStrokeColor
    },
    get pointStrokeSameAsFill() {
      return self.itemStrokeSameAsFill
    }

  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)

export interface IDisplayItemDescriptionModel extends Instance<typeof DisplayItemDescriptionModel> {
}
