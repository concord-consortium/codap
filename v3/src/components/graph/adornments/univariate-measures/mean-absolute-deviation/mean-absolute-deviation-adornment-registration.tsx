import React from "react"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { MeanAbsoluteDeviationAdornmentModel } from "./mean-absolute-deviation-adornment-model"
import { kMeanAbsoluteDeviationClass, kMeanAbsoluteDeviationLabelKey, kMeanAbsoluteDeviationType,
         kMeanAbsoluteDeviationPrefix } from "./mean-absolute-deviation-adornment-types"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { UnivariateMeasureAdornmentComponent } from "../univariate-measure-adornment-component"

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
  modelClass: MeanAbsoluteDeviationAdornmentModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMeanAbsoluteDeviationClass,
  Component: UnivariateMeasureAdornmentComponent,
  Controls,
  labelKey: kMeanAbsoluteDeviationLabelKey,
  order: 10,
  type: kMeanAbsoluteDeviationType
})
