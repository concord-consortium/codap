/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {types} from "mobx-state-tree"
import {TileContentModel} from "../../../models/tiles/tile-content"
// todo: remove this circular dependency using registration
// eslint-disable-next-line import/no-cycle
import {DataDisplayLayerModelUnion} from "./data-display-layer-union"
import {defaultPointColor, defaultStrokeColor, kellyColors} from "../../../utilities/color-utils"

export const DataDisplayContentModel = TileContentModel
  .named("DataDisplayContentModel")
  .props({
    layers: types.array(DataDisplayLayerModelUnion),
    _pointColors: types.optional(types.array(types.string), [defaultPointColor]),
    _pointStrokeColor: defaultStrokeColor,
    pointStrokeSameAsFill: false,
  })
  .actions(self => ({
    setPointColor(color: string, plotIndex = 0) {
      self._pointColors[plotIndex] = color
    },
    setPointStrokeColor(color: string) {
      self._pointStrokeColor = color
    },
    setPointStrokeSameAsFill(isTheSame: boolean) {
      self.pointStrokeSameAsFill = isTheSame
    },
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
  .actions(self => ({
  }))
