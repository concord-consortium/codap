import React from "react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { PlottedValueAdornmentModel } from "./plotted-value-adornment-model"
import { kPlottedValueClass, kPlottedValueLabelKey, kPlottedValuePrefix, kPlottedValueRedoAddKey,
         kPlottedValueRedoRemoveKey, kPlottedValueType, kPlottedValueUndoAddKey,
         kPlottedValueUndoRemoveKey} from "./plotted-value-adornment-types"
import { PlottedValueAdornment } from "./plotted-value-adornment-component"
import { AdornmentCheckbox } from "../adornment-checkbox"
import { PlottedValueAdornmentBanner } from "./plotted-value-adornment-banner"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kPlottedValueClass}
      labelKey={kPlottedValueLabelKey}
      type={kPlottedValueType}
    />
  )
}

registerAdornmentContentInfo({
  type: kPlottedValueType,
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
  Component: PlottedValueAdornment,
  Controls,
  BannerComponent: PlottedValueAdornmentBanner,
  labelKey: kPlottedValueLabelKey,
  order: 10,
  type: kPlottedValueType
})
