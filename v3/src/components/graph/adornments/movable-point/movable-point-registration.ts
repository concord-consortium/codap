import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { MovablePointModel } from "./movable-point-model"
import { kMovablePointClass, kMovablePointLabelKey, kMovablePointPrefix,
         kMovablePointType } from "./movable-point-types"
import { MovablePoint } from "./movable-point"

registerAdornmentContentInfo({
  type: kMovablePointType,
  plots: ['scatterPlot'],
  prefix: kMovablePointPrefix,
  modelClass: MovablePointModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovablePointClass,
  Component: MovablePoint,
  labelKey: kMovablePointLabelKey,
  order: 30,
  type: kMovablePointType
})
