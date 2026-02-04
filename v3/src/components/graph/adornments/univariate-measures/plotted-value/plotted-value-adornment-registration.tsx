import { registerAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { exportAdornmentBase, registerAdornmentContentInfo } from "../../adornment-content-info"
import { AdornmentCheckbox } from "../../components/adornment-checkbox"
import { PlottedValueAdornmentBanner } from "./plotted-value-adornment-banner"
import { PlottedValueComponent } from "./plotted-value-adornment-component"
import { plottedValueAdornmentHandler } from "./plotted-value-adornment-handler"
import { isPlottedValueAdornment, PlottedValueAdornmentModel } from "./plotted-value-adornment-model"
import {
  kPlottedValueClass, kPlottedValueLabelKey, kPlottedValuePrefix, kPlottedValueRedoAddKey,
  kPlottedValueRedoRemoveKey, kPlottedValueType, kPlottedValueUndoAddKey,
  kPlottedValueUndoRemoveKey
} from "./plotted-value-adornment-types"
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
  },
  exporter: (model, options) => {
    const adornment = isPlottedValueAdornment(model) ? model : undefined
    return adornment
            ? {
                plottedValue: {
                  ...exportAdornmentBase(model, options),
                  adornmentKey: "plottedValue",
                  expression: adornment.expression
                }
              }
            : undefined
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

registerAdornmentHandler(kPlottedValueType, plottedValueAdornmentHandler)
