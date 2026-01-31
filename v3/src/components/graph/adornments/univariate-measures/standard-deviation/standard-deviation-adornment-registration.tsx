import { registerAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { AdornmentCheckbox } from "../../components/adornment-checkbox"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"
import { exportUnivariateMeasure } from "../univariate-measure-adornment-utils"
import { standardDeviationAdornmentHandler } from "./standard-deviation-adornment-handler"
import { isStandardDeviationAdornment, StandardDeviationAdornmentModel } from "./standard-deviation-adornment-model"
import {
  kStandardDeviationClass, kStandardDeviationLabelKey, kStandardDeviationType, kStandardDeviationPrefix,
  kStandardDeviationUndoAddKey, kStandardDeviationRedoAddKey, kStandardDeviationRedoRemoveKey,
  kStandardDeviationUndoRemoveKey
} from "./standard-deviation-adornment-types"

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
  },
  exporter: (model, options) => {
    const adornment = isStandardDeviationAdornment(model) ? model : undefined
    return adornment
            ? { plottedStDev: { ...exportUnivariateMeasure(adornment, options) } }
            : undefined
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kStandardDeviationClass,
  Component: UnivariateMeasureAdornmentSimpleComponent,
  Controls,
  labelKey: kStandardDeviationLabelKey,
  order: 10,
  type: kStandardDeviationType
})

registerAdornmentHandler(kStandardDeviationType, standardDeviationAdornmentHandler)
