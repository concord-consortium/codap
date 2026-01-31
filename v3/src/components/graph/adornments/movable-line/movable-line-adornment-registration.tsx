import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { ICodapV2MovableLineAdornment } from "../../../../v2/codap-v2-types"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { exportAdornmentBase, registerAdornmentContentInfo } from "../adornment-content-info"
import { AdornmentCheckbox } from "../components/adornment-checkbox"
import { MovableLineAdornment } from "./movable-line-adornment-component"
import { movableLineAdornmentHandler } from "./movable-line-adornment-handler"
import { isMovableLineAdornment, MovableLineAdornmentModel } from "./movable-line-adornment-model"
import {
  kMovableLineClass, kMovableLineLabelKey, kMovableLinePrefix, kMovableLineRedoAddKey,
  kMovableLineRedoRemoveKey, kMovableLineType, kMovableLineUndoAddKey, kMovableLineUndoRemoveKey
} from "./movable-line-adornment-types"

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
  },
  exporter: (model, options) => {
    const adornment = isMovableLineAdornment(model) ? model : undefined
    if (!adornment) return undefined
    const firstLineInstance = adornment.firstLineInstance
    if (!firstLineInstance) return undefined
    const isVertical = !isFinite(firstLineInstance.slope)
    return {
      // v2 never writes out more than one movable line instance
      movableLineStorage: {
        ...exportAdornmentBase(adornment, options),
        isInterceptLocked: options.isInterceptLocked,
        equationCoords: firstLineInstance.v2ExportCoords ?? null,
        intercept: isVertical ? null : firstLineInstance.intercept,
        slope: isVertical ? null : firstLineInstance.slope,
        isVertical,
        xIntercept: isVertical ? firstLineInstance.intercept : null
      } as ICodapV2MovableLineAdornment
    }
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

registerAdornmentHandler(kMovableLineType, movableLineAdornmentHandler)
