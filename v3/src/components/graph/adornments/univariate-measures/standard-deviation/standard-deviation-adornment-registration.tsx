import React from "react"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { StandardDeviationAdornmentModel } from "./standard-deviation-adornment-model"
import { kStandardDeviationClass, kStandardDeviationLabelKey, kStandardDeviationType, kStandardDeviationPrefix, 
         kStandardDeviationUndoAddKey, kStandardDeviationRedoAddKey, kStandardDeviationRedoRemoveKey,
         kStandardDeviationUndoRemoveKey} from "./standard-deviation-adornment-types"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { UnivariateMeasureAdornmentComponent } from "../univariate-measure-adornment-component"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kStandardDeviationClass}
      labelKey={kStandardDeviationLabelKey}
      type={kStandardDeviationType}
    />
  )
}

registerAdornmentContentInfo({
  type: kStandardDeviationType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kStandardDeviationPrefix,
  modelClass: StandardDeviationAdornmentModel,
  undoRedoKeys: {
    undoAdd: kStandardDeviationUndoAddKey,
    redoAdd: kStandardDeviationRedoAddKey,
    undoRemove: kStandardDeviationUndoRemoveKey,
    redoRemove: kStandardDeviationRedoRemoveKey,
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kStandardDeviationClass,
  Component: UnivariateMeasureAdornmentComponent,
  Controls,
  labelKey: kStandardDeviationLabelKey,
  order: 10,
  type: kStandardDeviationType
})
