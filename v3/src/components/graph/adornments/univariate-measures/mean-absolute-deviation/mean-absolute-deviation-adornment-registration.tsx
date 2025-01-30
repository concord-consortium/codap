import React from "react"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { exportAdornmentBaseWithCoordsArray, registerAdornmentContentInfo } from "../../adornment-content-info"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"
import {
  isMeanAbsoluteDeviationAdornment, MeanAbsoluteDeviationAdornmentModel
} from "./mean-absolute-deviation-adornment-model"
import {
  kMeanAbsoluteDeviationClass, kMeanAbsoluteDeviationLabelKey, kMeanAbsoluteDeviationPrefix, kMeanAbsoluteDeviationType
} from "./mean-absolute-deviation-adornment-types"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kMeanAbsoluteDeviationClass}
      labelKey={kMeanAbsoluteDeviationLabelKey}
      type={kMeanAbsoluteDeviationType}
    />
  )
}

registerAdornmentContentInfo({
  type: kMeanAbsoluteDeviationType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kMeanAbsoluteDeviationPrefix,
  modelClass: MeanAbsoluteDeviationAdornmentModel,
  exporter: (model, options) => {
    const adornment = isMeanAbsoluteDeviationAdornment(model) ? model : undefined
    return adornment
            ? { plottedMad: { ...exportAdornmentBaseWithCoordsArray(model, options) } }
            : undefined
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMeanAbsoluteDeviationClass,
  Component: UnivariateMeasureAdornmentSimpleComponent,
  Controls,
  labelKey: kMeanAbsoluteDeviationLabelKey,
  order: 10,
  type: kMeanAbsoluteDeviationType
})
