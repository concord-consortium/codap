/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {ISerializedActionCall, types} from "mobx-state-tree"
import {TileContentModel} from "../../../models/tiles/tile-content"
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
    setPointStrokeSameAsFill(isSame: boolean) {
      self.pointStrokeSameAsFill = isSame
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

export interface ISetPointColorAction extends ISerializedActionCall {
  name: "setPointColor",
  args: [color: string, plotIndex?: number]
}
export function isSetPointColorAction(action: ISerializedActionCall): action is ISetPointColorAction {
  return action.name === "setPointColor"
}

export interface ISetPointStrokeColorAction extends ISerializedActionCall {
  name: "setPointStrokeColor",
  args: [color: string]
}
export function isSetPointStrokeColorAction(action: ISerializedActionCall): action is ISetPointStrokeColorAction {
  return action.name === "setPointStrokeColor"
}

export interface ISetPointStrokeSameAsFillAction extends ISerializedActionCall {
  name: "setPointStrokeSameAsFill",
  args: [isSame: boolean]
}
export function isSetPointStrokeSameAsFillAction(action: ISerializedActionCall)
  : action is ISetPointStrokeSameAsFillAction {
  return action.name === "setPointStrokeSameAsFill"
}

export type SetPointOrStrokeColorAction =
  ISetPointColorAction | ISetPointStrokeColorAction | ISetPointStrokeSameAsFillAction

export function isSetPointOrStrokeColorFunction(action: ISerializedActionCall): action is SetPointOrStrokeColorAction {
  return ["setPointColor", "setPointStrokeColor", "setPointStrokeSameAsFill"].includes(action.name)
}
