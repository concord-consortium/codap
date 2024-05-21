import React from "react"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import {
  kNormalCurveClass, kNormalCurveLabelKey, kNormalCurveType, kNormalCurvePrefix,
  kNormalCurveUndoAddKey, kNormalCurveRedoAddKey, kNormalCurveRedoRemoveKey,
  kNormalCurveUndoRemoveKey
} from "./normal-curve-adornment-types"
import { NormalCurveAdornmentModel } from "./normal-curve-adornment-model"
import { NormalCurveAdornmentComponent } from "./normal-curve-adornment-component"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kNormalCurveClass}
      labelKey={kNormalCurveLabelKey}
      type={kNormalCurveType}
    />
  )
}

registerAdornmentContentInfo({
  type: kNormalCurveType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kNormalCurvePrefix,
  modelClass: NormalCurveAdornmentModel,
  undoRedoKeys: {
    undoAdd: kNormalCurveUndoAddKey,
    redoAdd: kNormalCurveRedoAddKey,
    undoRemove: kNormalCurveUndoRemoveKey,
    redoRemove: kNormalCurveRedoRemoveKey,
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kNormalCurveClass,
  Component: NormalCurveAdornmentComponent,
  Controls,
  labelKey: kNormalCurveLabelKey,
  order: 10,
  type: kNormalCurveType
})
