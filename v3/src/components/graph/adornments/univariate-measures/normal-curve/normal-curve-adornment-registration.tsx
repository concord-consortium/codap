import { registerAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { AdornmentCheckbox } from "../../components/adornment-checkbox"
import { useGraphOptions } from "../../hooks/use-graph-options"
import { exportUnivariateMeasure } from "../univariate-measure-adornment-utils"
import { NormalCurveAdornmentComponent } from "./normal-curve-adornment-component"
import { normalCurveAdornmentHandler } from "./normal-curve-adornment-handler"
import { isNormalCurveAdornment, NormalCurveAdornmentModel } from "./normal-curve-adornment-model"
import {
  kNormalCurveClass, kNormalCurveLabelKey, kNormalCurveType, kNormalCurvePrefix,
  kNormalCurveUndoAddKey, kNormalCurveRedoAddKey, kNormalCurveRedoRemoveKey,
  kNormalCurveUndoRemoveKey, kGaussianFitLabelKey
} from "./normal-curve-adornment-types"

const Controls = () => {
  const { isGaussianFit } = useGraphOptions()
  const labelKey = isGaussianFit ? kGaussianFitLabelKey : kNormalCurveLabelKey
  return (
    <AdornmentCheckbox
      classNameValue={kNormalCurveClass}
      labelKey={labelKey}
      type={kNormalCurveType}
    />
  )
}

registerAdornmentContentInfo({
  type: kNormalCurveType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kNormalCurvePrefix,
  modelClass: NormalCurveAdornmentModel,
  undoRedoKeys: {
    undoAdd: kNormalCurveUndoAddKey,
    redoAdd: kNormalCurveRedoAddKey,
    undoRemove: kNormalCurveUndoRemoveKey,
    redoRemove: kNormalCurveRedoRemoveKey,
  },
  exporter: (model, options) => {
    const adornment = isNormalCurveAdornment(model) ? model : undefined
    return adornment
            ? { plottedNormal: { ...exportUnivariateMeasure(adornment, options) } }
            : undefined
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kNormalCurveClass,
  Component: NormalCurveAdornmentComponent,
  Controls,
  labelKey: kNormalCurveLabelKey,
  order: 10,
  type: kNormalCurveType
})

registerAdornmentHandler(kNormalCurveType, normalCurveAdornmentHandler)
