import { registerAdornmentComponentInfo } from "./adornment-component-info"
import { registerAdornmentContentInfo } from "./adornment-content-info"
import { MovablePointModel } from "./adornment-models"
import { kMovablePointClass, kMovablePointHint, kMovablePointLabel,
          kMovablePointPrefix, kMovablePointType } from "./movable-point-types"
import { MovablePoint } from "./components/movable-point"

registerAdornmentComponentInfo({
  adornmentEltClass: kMovablePointClass,
  Component: MovablePoint,
  hint: kMovablePointHint,
  label: kMovablePointLabel,
  order: 1,
  type: kMovablePointType
})
registerAdornmentContentInfo({
  type: kMovablePointType,
  plots: ['scatterPlot'],
  prefix: kMovablePointPrefix,
  modelClass: MovablePointModel
})
