import React from "react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { PlottedFunctionAdornmentModel } from "./plotted-function-adornment-model"
import { kPlottedFunctionClass, kPlottedFunctionLabelKey, kPlottedFunctionPrefix, kPlottedFunctionRedoAddKey,
         kPlottedFunctionRedoRemoveKey, kPlottedFunctionType, kPlottedFunctionUndoAddKey,
         kPlottedFunctionUndoRemoveKey} from "./plotted-function-adornment-types"
import { AdornmentCheckbox } from "../adornment-checkbox"
import { PlottedFunctionAdornmentBanner } from "./plotted-function-adornment-banner"
import { PlottedFunctionAdornmentComponent } from "./plotted-function-adornment-component"
import { PlottedFunctionFormulaAdapter } from "./plotted-function-formula-adapter"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kPlottedFunctionClass}
      labelKey={kPlottedFunctionLabelKey}
      type={kPlottedFunctionType}
    />
  )
}

PlottedFunctionFormulaAdapter.register()

registerAdornmentContentInfo({
  type: kPlottedFunctionType,
  plots: ["scatterPlot"],
  prefix: kPlottedFunctionPrefix,
  modelClass: PlottedFunctionAdornmentModel,
  undoRedoKeys: {
    undoAdd: kPlottedFunctionUndoAddKey,
    redoAdd: kPlottedFunctionRedoAddKey,
    undoRemove: kPlottedFunctionUndoRemoveKey,
    redoRemove: kPlottedFunctionRedoRemoveKey
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kPlottedFunctionClass,
  Component: PlottedFunctionAdornmentComponent,
  Controls,
  BannerComponent: PlottedFunctionAdornmentBanner,
  labelKey: kPlottedFunctionLabelKey,
  order: 10,
  type: kPlottedFunctionType
})
