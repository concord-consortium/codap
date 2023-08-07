import React from "react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { MovableLineModel } from "./movable-line-model"
import { kMovableLineClass, kMovableLineLabelKey, kMovableLinePrefix, kMovableLineType } from "./movable-line-types"
import { MovableLine } from "./movable-line"
import { AdornmentCheckbox } from "../adornment-checkbox"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kMovableLineClass}
      labelKey={kMovableLineLabelKey}
      type={kMovableLineType}
    />
  )
}

registerAdornmentContentInfo({
  type: kMovableLineType,
  plots: ['scatterPlot'],
  prefix: kMovableLinePrefix,
  modelClass: MovableLineModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovableLineClass,
  Component: MovableLine,
  Controls,
  labelKey: kMovableLineLabelKey,
  order: 20,
  type: kMovableLineType
})
