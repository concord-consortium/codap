import React from "react"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { StandardErrorAdornmentModel } from "./standard-error-adornment-model"
import { kStandardErrorClass, kStandardErrorLabelKey, kStandardErrorType, kStandardErrorPrefix, 
         kStandardErrorUndoAddKey, kStandardErrorRedoAddKey, kStandardErrorRedoRemoveKey,
         kStandardErrorUndoRemoveKey} from "./standard-error-adornment-types"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { StandardErrorAdornmentComponent } from "./standard-error-adornment-component"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kStandardErrorClass}
      labelKey={kStandardErrorLabelKey}
      type={kStandardErrorType}
    />
  )
}

registerAdornmentContentInfo({
  type: kStandardErrorType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kStandardErrorPrefix,
  modelClass: StandardErrorAdornmentModel,
  undoRedoKeys: {
    undoAdd: kStandardErrorUndoAddKey,
    redoAdd: kStandardErrorRedoAddKey,
    undoRemove: kStandardErrorUndoRemoveKey,
    redoRemove: kStandardErrorRedoRemoveKey,
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kStandardErrorClass,
  Component: StandardErrorAdornmentComponent,
  Controls,
  labelKey: kStandardErrorLabelKey,
  order: 10,
  type: kStandardErrorType
})
