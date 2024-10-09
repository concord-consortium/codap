import React from "react"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { PlottedValueAdornmentModel } from "./plotted-value-adornment-model"
import { kPlottedValueClass, kPlottedValueLabelKey, kPlottedValuePrefix, kPlottedValueRedoAddKey,
         kPlottedValueRedoRemoveKey, kPlottedValueType, kPlottedValueUndoAddKey,
         kPlottedValueUndoRemoveKey} from "./plotted-value-adornment-types"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { PlottedValueAdornmentBanner } from "./plotted-value-adornment-banner"
import { PlottedValueComponent } from "./plotted-value-adornment-component"
import { PlottedValueFormulaAdapter } from "./plotted-value-formula-adapter"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kPlottedValueClass}
      labelKey={kPlottedValueLabelKey}
      type={kPlottedValueType}
    />
  )
}

PlottedValueFormulaAdapter.register()

registerAdornmentContentInfo({
  type: kPlottedValueType,
  parentType: "Univariate Measure",
  plots: ["dotPlot", "scatterPlot"],
  prefix: kPlottedValuePrefix,
  modelClass: PlottedValueAdornmentModel,
  undoRedoKeys: {
    undoAdd: kPlottedValueUndoAddKey,
    redoAdd: kPlottedValueRedoAddKey,
    undoRemove: kPlottedValueUndoRemoveKey,
    redoRemove: kPlottedValueRedoRemoveKey
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kPlottedValueClass,
  Component: PlottedValueComponent,
  Controls,
  BannerComponent: PlottedValueAdornmentBanner,
  labelKey: kPlottedValueLabelKey,
  order: 10,
  type: kPlottedValueType
})
