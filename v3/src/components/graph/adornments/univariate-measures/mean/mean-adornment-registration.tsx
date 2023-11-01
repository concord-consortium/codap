import React from "react"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { MeanAdornmentModel } from "./mean-adornment-model"
import { kMeanClass, kMeanLabelKey, kMeanType, kMeanPrefix, kMeanUndoAddKey, kMeanRedoAddKey,
         kMeanUndoRemoveKey, kMeanRedoRemoveKey } from "./mean-adornment-types"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kMeanClass}
      labelKey={kMeanLabelKey}
      type={kMeanType}
    />
  )
}

registerAdornmentContentInfo({
  type: kMeanType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kMeanPrefix,
  modelClass: MeanAdornmentModel,
  undoRedoKeys: {
    undoAdd: kMeanUndoAddKey,
    redoAdd: kMeanRedoAddKey,
    undoRemove: kMeanUndoRemoveKey,
    redoRemove: kMeanRedoRemoveKey,
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMeanClass,
  Component: UnivariateMeasureAdornmentSimpleComponent,
  Controls,
  labelKey: kMeanLabelKey,
  order: 10,
  type: kMeanType
})
