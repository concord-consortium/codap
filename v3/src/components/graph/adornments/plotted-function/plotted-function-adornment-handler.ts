import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { adornmentMismatchResult, formulaValue } from "../utilities/adornment-handler-utils"
import { adornmentWriteHandlers } from "../utilities/adornment-write-handlers"
import { isPlottedFunctionAdornment } from "./plotted-function-adornment-model"
import { kPlottedFunctionType } from "./plotted-function-adornment-types"

function get(adornment: IAdornmentModel, _graphContent: IGraphContentModel) {
  if (!isPlottedFunctionAdornment(adornment)) return adornmentMismatchResult(kPlottedFunctionType)

  const { error, formula: _formula } = adornment
  const formula = JSON.stringify(_formula.display)

  return { error, formula }
}

// `formula`, or `expression` as Plotted Value calls it, sets the function of x to plot
function applyValues(adornment: IAdornmentModel, values: Record<string, unknown>) {
  const { formula } = formulaValue(values)
  if (formula != null && isPlottedFunctionAdornment(adornment)) adornment.setExpression(formula)
}

export const plottedFunctionAdornmentHandler: DIAdornmentHandler = {
  get,
  ...adornmentWriteHandlers({
    adornmentType: kPlottedFunctionType, get, applyValues,
    validate: values => formulaValue(values).error
  })
}
