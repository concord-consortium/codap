import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { exportAdornmentBase, registerAdornmentContentInfo } from "../adornment-content-info"
import { AdornmentCheckbox } from "../components/adornment-checkbox"
import { MovablePointAdornment } from "./movable-point-adornment-component"
import { movablePointAdornmentHandler } from "./movable-point-adornment-handler"
import { isMovablePointAdornment, MovablePointAdornmentModel } from "./movable-point-adornment-model"
import {
  kMovablePointClass, kMovablePointLabelKey, kMovablePointPrefix, kMovablePointRedoAddKey,
  kMovablePointRedoRemoveKey, kMovablePointType, kMovablePointUndoAddKey, kMovablePointUndoRemoveKey
} from "./movable-point-adornment-types"

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
  },
  exporter: (model, options) => {
    const adornment = isMovablePointAdornment(model) ? model : undefined
    if (!adornment) return undefined
    const firstPoint = adornment.firstPoint
    if (!firstPoint) return undefined
    return {
      // v2 never writes out more than one movable point instance
      movablePointStorage: {
        ...exportAdornmentBase(adornment, options),
        coordinates: { x: firstPoint.x, y: firstPoint.y }
      }
    }
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

registerAdornmentHandler(kMovablePointType, movablePointAdornmentHandler)
