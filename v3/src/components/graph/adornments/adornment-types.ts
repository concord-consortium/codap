import { types } from "mobx-state-tree"
import { IAdornmentModel, IUnknownAdornmentModel, UnknownAdornmentModel } from "./adornment-models"
import { IMovableLineModel, MovableLineModel } from "./movable-line/movable-line-model"
import { IMovablePointModel, MovablePointModel } from "./movable-point/movable-point-model"
import { IMovableValueModel, MovableValueModel } from "./movable-value/movable-value-model"
import { CountModel, ICountModel } from "./count/count-model"
import { IPlottedValueModel, PlottedValueModel } from "./plotted-value/plotted-value-model"

export const kGraphAdornmentsClass = "graph-adornments-grid"
export const kGraphAdornmentsClassSelector = `.${kGraphAdornmentsClass}`

const adornmentTypeDispatcher = (adornmentSnap: IAdornmentModel) => {
  switch (adornmentSnap.type) {
    case "Count": return CountModel
    case "Movable Line": return MovableLineModel
    case "Movable Point": return MovablePointModel
    case "Movable Value": return MovableValueModel
    case "Plotted Value": return PlottedValueModel
    default: return UnknownAdornmentModel
  }
}

export const AdornmentModelUnion = types.union({ dispatcher: adornmentTypeDispatcher },
  CountModel, MovableValueModel, MovableLineModel, MovablePointModel, PlottedValueModel, UnknownAdornmentModel)
export type IAdornmentModelUnion = ICountModel | IMovableValueModel | IMovableLineModel | IMovablePointModel |
  IPlottedValueModel | IUnknownAdornmentModel
