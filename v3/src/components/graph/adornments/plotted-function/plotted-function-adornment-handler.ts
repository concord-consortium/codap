import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isPlottedFunctionAdornment } from "./plotted-function-adornment-model"

export const plottedFunctionAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isPlottedFunctionAdornment(adornment)) {
      return { success: false, values: { error: "Not a plotted function adornment" } }
    }

    const { formula: _formula, id } = adornment
    const formula = JSON.stringify(_formula.canonical)

    return { formula, id }
  }
}
