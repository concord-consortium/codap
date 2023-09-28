import React from "react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { MovableLineAdornmentModel } from "./movable-line-adornment-model"
import { kMovableLineClass, kMovableLineLabelKey, kMovableLinePrefix, kMovableLineRedoAddKey,
         kMovableLineRedoRemoveKey, kMovableLineType, kMovableLineUndoAddKey,
         kMovableLineUndoRemoveKey } from "./movable-line-adornment-types"
import { MovableLineAdornment } from "./movable-line-adornment-component"
import { AdornmentCheckbox } from "../adornment-checkbox"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kMovableLineClass}
      labelKey={kMovableLineLabelKey}
      type={kMovableLineType}
    />
  )
}

registerAdornmentContentInfo({
  type: kMovableLineType,
  plots: ['scatterPlot'],
  prefix: kMovableLinePrefix,
  modelClass: MovableLineAdornmentModel,
  undoRedoKeys: {
    undoAdd: kMovableLineUndoAddKey,
    redoAdd: kMovableLineRedoAddKey,
    undoRemove: kMovableLineUndoRemoveKey,
    redoRemove: kMovableLineRedoRemoveKey
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovableLineClass,
  Component: MovableLineAdornment,
  Controls,
  labelKey: kMovableLineLabelKey,
  order: 20,
  type: kMovableLineType
})
