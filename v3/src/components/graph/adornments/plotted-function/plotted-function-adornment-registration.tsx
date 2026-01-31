import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { exportAdornmentBase, registerAdornmentContentInfo } from "../adornment-content-info"
import { AdornmentCheckbox } from "../components/adornment-checkbox"
import { PlottedFunctionAdornmentBanner } from "./plotted-function-adornment-banner"
import { PlottedFunctionAdornmentComponent } from "./plotted-function-adornment-component"
import { plottedFunctionAdornmentHandler } from "./plotted-function-adornment-handler"
import { isPlottedFunctionAdornment, PlottedFunctionAdornmentModel } from "./plotted-function-adornment-model"
import {
  kPlottedFunctionClass, kPlottedFunctionLabelKey, kPlottedFunctionPrefix, kPlottedFunctionRedoAddKey,
  kPlottedFunctionRedoRemoveKey, kPlottedFunctionType, kPlottedFunctionUndoAddKey, kPlottedFunctionUndoRemoveKey
} from "./plotted-function-adornment-types"
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
  },
  exporter: (model, options) => {
    const adornment = isPlottedFunctionAdornment(model) ? model : undefined
    return adornment
            ? {
                plottedFunction: {
                  ...exportAdornmentBase(model, options),
                  adornmentKey: "plottedFunction",
                  expression: adornment.expression
                }
              }
            : undefined
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

registerAdornmentHandler(kPlottedFunctionType, plottedFunctionAdornmentHandler)
