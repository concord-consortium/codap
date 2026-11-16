import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { cellKeyToString } from "../../../utilities/cell-key-utils"
import { IAdornmentModel } from "../../adornment-models"
import {
  AdornmentData, adornmentMismatchResult, cellKeyToCategories, formulaValue
} from "../../utilities/adornment-handler-utils"
import { adornmentWriteHandlers } from "../../utilities/adornment-write-handlers"
import { isPlottedValueAdornment } from "./plotted-value-adornment-model"
import { kPlottedValueType } from "./plotted-value-adornment-types"

function get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
  if (!isPlottedValueAdornment(adornment)) return adornmentMismatchResult(kPlottedValueType)

  const { error, formula: _formula } = adornment
  const formula = JSON.stringify(_formula.display)
  const dataConfig = graphContent.dataConfiguration
  const cellKeys = dataConfig?.getAllCellKeys()
  const data: AdornmentData[] = []

  for (const cellKey of cellKeys) {
    const cellKeyString = cellKeyToString(cellKey)
    const plottedValue = adornment.measures.get(cellKeyString)?.value ?? NaN
    const dataItem: AdornmentData = { plottedValue }

    if (Object.keys(cellKey).length > 0) {
      dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
    }

    data.push(dataItem)
  }

  return { data, error, formula }
}

function applyValues(adornment: IAdornmentModel, values: Record<string, unknown>) {
  const { formula } = formulaValue(values)
  if (formula != null && isPlottedValueAdornment(adornment)) adornment.setExpression(formula)
}

export const plottedValueAdornmentHandler: DIAdornmentHandler = {
  get,
  ...adornmentWriteHandlers({
    adornmentType: kPlottedValueType, get, applyValues,
    validate: values => formulaValue(values).error
  })
}
