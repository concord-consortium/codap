import React from "react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { MovablePointModel } from "./movable-point-model"
import { kMovablePointClass, kMovablePointLabelKey, kMovablePointPrefix,
         kMovablePointType } from "./movable-point-types"
import { MovablePoint } from "./movable-point"
import { AdornmentCheckbox } from "../adornment-checkbox"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kMovablePointClass}
      labelKey={kMovablePointLabelKey}
      type={kMovablePointType}
    />
  )
}

registerAdornmentContentInfo({
  type: kMovablePointType,
  plots: ['scatterPlot'],
  prefix: kMovablePointPrefix,
  modelClass: MovablePointModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovablePointClass,
  Component: MovablePoint,
  Controls,
  labelKey: kMovablePointLabelKey,
  order: 10,
  type: kMovablePointType
})
