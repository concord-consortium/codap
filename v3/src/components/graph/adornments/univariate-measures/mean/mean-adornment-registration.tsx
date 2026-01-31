import { registerAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { AdornmentCheckbox } from "../../components/adornment-checkbox"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"
import { exportUnivariateMeasure } from "../univariate-measure-adornment-utils"
import { meanAdornmentHandler } from "./mean-adornment-handler"
import { isMeanAdornment, MeanAdornmentModel } from "./mean-adornment-model"
import {
  kMeanClass, kMeanLabelKey, kMeanType, kMeanPrefix, kMeanUndoAddKey, kMeanRedoAddKey,
  kMeanUndoRemoveKey, kMeanRedoRemoveKey
} from "./mean-adornment-types"

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
  },
  exporter: (model, options) => {
    const adornment = isMeanAdornment(model) ? model : undefined
    return adornment
            ? { plottedMean: { ...exportUnivariateMeasure(adornment, options) } }
            : undefined
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

registerAdornmentHandler(kMeanType, meanAdornmentHandler)
