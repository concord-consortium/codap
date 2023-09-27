import React from "react"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { MedianAdornmentModel } from "./median-adornment-model"
import { kMedianClass, kMedianLabelKey, kMedianPrefix, kMedianType } from "./median-adornment-types"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { UnivariateMeasureAdornmentComponent } from "../univariate-measure-adornment-component"

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
  modelClass: MedianAdornmentModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMedianClass,
  Component: UnivariateMeasureAdornmentComponent,
  Controls,
  labelKey: kMedianLabelKey,
  order: 10,
  type: kMedianType
})
