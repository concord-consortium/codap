import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { MovableLineModel } from "./movable-line-model"
import { kMovableLineClass, kMovableLineLabelKey, kMovableLinePrefix, kMovableLineType } from "./movable-line-types"
import { MovableLine } from "./movable-line"

registerAdornmentContentInfo({
  type: kMovableLineType,
  plots: ['scatterPlot'],
  prefix: kMovableLinePrefix,
  modelClass: MovableLineModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovableLineClass,
  Component: MovableLine,
  labelKey: kMovableLineLabelKey,
  order: 40,
  type: kMovableLineType
})
