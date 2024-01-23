import {types} from "mobx-state-tree"
import {defaultPointColor, defaultStrokeColor, kellyColors} from "../../../utilities/color-utils"

export const PointDescriptionModel = types
  .model("PointDescriptionModel", {
    _pointColors: types.optional(types.array(types.string), [defaultPointColor]),
    _pointStrokeColor: defaultStrokeColor,
    pointStrokeSameAsFill: false,
    pointSizeMultiplier: 1,
  })
  .volatile(() => ({
    animateChange: false,
  }))
  .actions(self => ({
    setPointColor(color: string, plotIndex = 0) {
      self._pointColors[plotIndex] = color
    },
    setPointStrokeColor(color: string) {
      self._pointStrokeColor = color
    },
    setPointStrokeSameAsFill(isSame: boolean) {
      self.pointStrokeSameAsFill = isSame
    },
    setPointSizeMultiplier(multiplier: number, animateChange = false) {
      self.pointSizeMultiplier = multiplier
      self.animateChange = animateChange
    },
    clearAnimateChange() {
      self.animateChange = false
    }
  }))
  .views(self => ({
    pointColorAtIndex(plotIndex = 0) {
      return self._pointColors[plotIndex] ?? kellyColors[plotIndex % kellyColors.length]
    },
    get pointColor() {
      return this.pointColorAtIndex(0)
    },
    get pointStrokeColor() {
      return self.pointStrokeSameAsFill ? this.pointColor : self._pointStrokeColor
    },
  }))
