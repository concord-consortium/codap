import { types } from "@concord-consortium/mobx-state-tree"
import { IAdornmentModel, IUnknownAdornmentModel, UnknownAdornmentModel } from "./adornment-models"
import { IMovableLineModel, MovableLineModel } from "./movable-line/movable-line-model"
import { IMovablePointModel, MovablePointModel } from "./movable-point/movable-point-model"
import { IMovableValueModel, MovableValueModel } from "./movable-value/movable-value-model"

export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`

const adornmentTypeDispatcher = (adornmentSnap: IAdornmentModel) => {
  switch (adornmentSnap.type) {
    case "Movable Line": return MovableLineModel
    case "Movable Point": return MovablePointModel
    case "Movable Value": return MovableValueModel
    default: return UnknownAdornmentModel
  }
}

export const AdornmentModelUnion = types.union({ dispatcher: adornmentTypeDispatcher },
  MovableValueModel, MovableLineModel, MovablePointModel, UnknownAdornmentModel)
export type IAdornmentModelUnion =
  IMovableValueModel | IMovableLineModel | IMovablePointModel | IUnknownAdornmentModel
