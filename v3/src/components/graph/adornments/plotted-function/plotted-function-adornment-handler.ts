import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { adornmentMismatchResult } from "../utilities/adornment-handler-utils"
import { isPlottedFunctionAdornment } from "./plotted-function-adornment-model"
import { kPlottedFunctionType } from "./plotted-function-adornment-types"

export const plottedFunctionAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isPlottedFunctionAdornment(adornment)) return adornmentMismatchResult(kPlottedFunctionType)

    const { error, formula: _formula } = adornment
    const formula = JSON.stringify(_formula.display)

    return { error, formula }
  }
}
