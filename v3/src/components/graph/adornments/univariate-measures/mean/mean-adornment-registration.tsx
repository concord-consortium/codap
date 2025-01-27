import React from "react"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { exportAdornmentBaseWithCoordsArray, registerAdornmentContentInfo } from "../../adornment-content-info"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"
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
            ? { plottedMean: { ...exportAdornmentBaseWithCoordsArray(model, options) } }
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
