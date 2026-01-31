import { registerAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { AdornmentCheckbox } from "../../components/adornment-checkbox"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"
import { exportUnivariateMeasure } from "../univariate-measure-adornment-utils"
import { medianAdornmentHandler } from "./median-adornment-handler"
import { isMedianAdornment, MedianAdornmentModel } from "./median-adornment-model"
import {
  kMedianClass, kMedianLabelKey, kMedianPrefix, kMedianRedoAddKey, kMedianRedoRemoveKey,
  kMedianType, kMedianUndoAddKey, kMedianUndoRemoveKey
} from "./median-adornment-types"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kMedianClass}
      labelKey={kMedianLabelKey}
      type={kMedianType}
    />
  )
}

registerAdornmentContentInfo({
  type: kMedianType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kMedianPrefix,
  modelClass: MedianAdornmentModel,
  undoRedoKeys: {
    undoAdd: kMedianUndoAddKey,
    redoAdd: kMedianRedoAddKey,
    undoRemove: kMedianUndoRemoveKey,
    redoRemove: kMedianRedoRemoveKey,
  },
  exporter: (model, options) => {
    const adornment = isMedianAdornment(model) ? model : undefined
    return adornment
            ? { plottedMedian: { ...exportUnivariateMeasure(adornment, options) } }
            : undefined
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMedianClass,
  Component: UnivariateMeasureAdornmentSimpleComponent,
  Controls,
  labelKey: kMedianLabelKey,
  order: 10,
  type: kMedianType
})

registerAdornmentHandler(kMedianType, medianAdornmentHandler)
