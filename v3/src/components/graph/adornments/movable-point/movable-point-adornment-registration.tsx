import React from "react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { MovablePointAdornmentModel } from "./movable-point-adornment-model"
import { kMovablePointClass, kMovablePointLabelKey, kMovablePointPrefix, kMovablePointRedoAddKey,
         kMovablePointRedoRemoveKey, kMovablePointType, kMovablePointUndoAddKey, 
         kMovablePointUndoRemoveKey} from "./movable-point-adornment-types"
import { MovablePointAdornment } from "./movable-point-adornment-component"
import { AdornmentCheckbox } from "../adornment-checkbox"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kMovablePointClass}
      labelKey={kMovablePointLabelKey}
      type={kMovablePointType}
    />
  )
}

registerAdornmentContentInfo({
  type: kMovablePointType,
  plots: ['scatterPlot'],
  prefix: kMovablePointPrefix,
  modelClass: MovablePointAdornmentModel,
  undoRedoKeys: {
    undoAdd: kMovablePointUndoAddKey,
    redoAdd: kMovablePointRedoAddKey,
    undoRemove: kMovablePointUndoRemoveKey,
    redoRemove: kMovablePointRedoRemoveKey
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovablePointClass,
  Component: MovablePointAdornment,
  Controls,
  labelKey: kMovablePointLabelKey,
  order: 10,
  type: kMovablePointType
})
