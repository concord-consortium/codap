import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult }
  from "../../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { cellKeyToString } from "../../../utilities/cell-key-utils"
import { getAdornmentContentInfo, isCompatibleWithPlotType } from "../../adornment-content-info"
import { IAdornmentModel } from "../../adornment-models"
import { IAdornmentsBaseStore } from "../../store/adornments-base-store"
import {
  AdornmentData, adornmentMismatchResult, cellKeyToCategories, formulaValue
} from "../../utilities/adornment-handler-utils"
import { isPlottedValueAdornment } from "./plotted-value-adornment-model"
import { kPlottedValueType } from "./plotted-value-adornment-types"

export const plottedValueAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent, values } = args
    if (!isCompatibleWithPlotType(kPlottedValueType, graphContent.plotType)) {
      return adornmentNotSupportedByPlotTypeResult
    }
    // `formula` (the key `get` reports) or `expression`
    const { formula, error } = formulaValue(valuesObject(values))
    if (error) return error

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingAdornment = adornmentsStore.findAdornmentOfType(kPlottedValueType)
    const componentContentInfo = getAdornmentContentInfo(kPlottedValueType)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create()

    if (formula != null && isPlottedValueAdornment(adornment)) adornment.setExpression(formula)

    if (!existingAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    adornment.setVisibility(true)

    for (const cellKey of cellKeys) {
      const cellKeyString = cellKeyToString(cellKey)
      const plottedValueAdornment = isPlottedValueAdornment(adornment) ? adornment : undefined
      const plottedValue = plottedValueAdornment?.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { plottedValue }

      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }

      data.push(dataItem)
    }

    const { id, isVisible, type } = adornment
    return { success: true, values: { id, isVisible, type, data } }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
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
  },

  update(args) {
    const { graphContent, values } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingAdornment = adornmentsStore.findAdornmentOfType(kPlottedValueType)
    if (!existingAdornment) return adornmentNotFoundResult
    const settings = valuesObject(values)
    const { formula, error } = formulaValue(settings)
    if (error) return error

    if (typeof settings.isVisible === "boolean") existingAdornment.setVisibility(settings.isVisible)
    if (formula != null && isPlottedValueAdornment(existingAdornment)) existingAdornment.setExpression(formula)

    return { success: true }
  },

  delete(args) {
    const { graphContent } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingAdornment = adornmentsStore.findAdornmentOfType(kPlottedValueType)
    if (!existingAdornment) return adornmentNotFoundResult

    adornmentsStore.hideAdornment(kPlottedValueType)
    return { success: true }
  }
}

function valuesObject(values: unknown) {
  return values != null && typeof values === "object" ? values as Record<string, unknown> : {}
}
