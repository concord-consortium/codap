import React from "react"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { useGraphOptions } from "../../hooks/use-graph-options"
import {
  kNormalCurveClass, kNormalCurveLabelKey, kNormalCurveType, kNormalCurvePrefix,
  kNormalCurveUndoAddKey, kNormalCurveRedoAddKey, kNormalCurveRedoRemoveKey,
  kNormalCurveUndoRemoveKey, kGaussianFitLabelKey
} from "./normal-curve-adornment-types"
import { NormalCurveAdornmentModel } from "./normal-curve-adornment-model"
import { NormalCurveAdornmentComponent } from "./normal-curve-adornment-component"

const Controls = () => {
  const { isGaussianFit } = useGraphOptions()
  const labelKey = isGaussianFit ? kGaussianFitLabelKey : kNormalCurveLabelKey
  return (
    <AdornmentCheckbox
      classNameValue={kNormalCurveClass}
      labelKey={labelKey}
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
