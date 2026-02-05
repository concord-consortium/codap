import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { isAdornmentValues } from "../../../../../data-interactive/data-interactive-adornment-types"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult }
  from "../../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { cellKeyToString } from "../../../utilities/cell-key-utils"
import { getAdornmentContentInfo, isCompatibleWithPlotType } from "../../adornment-content-info"
import { IAdornmentModel } from "../../adornment-models"
import { IAdornmentsBaseStore } from "../../store/adornments-base-store"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { isPlottedValueAdornment } from "./plotted-value-adornment-model"
import { kPlottedValueType } from "./plotted-value-adornment-types"

export const plottedValueAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent, values } = args
    if (!isCompatibleWithPlotType(kPlottedValueType, graphContent.plotType)) {
      return adornmentNotSupportedByPlotTypeResult
    }

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingAdornment = adornmentsStore.findAdornmentOfType(kPlottedValueType)
    const componentContentInfo = getAdornmentContentInfo(kPlottedValueType)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create()

    // Set the expression if provided in the values
    if (isAdornmentValues(values) && "expression" in values && values.expression) {
      const plottedValueAdornment = isPlottedValueAdornment(adornment) ? adornment : undefined
      if (plottedValueAdornment) {
        plottedValueAdornment.setExpression(values.expression as string)
      }
    }

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

    if (isAdornmentValues(values) && "isVisible" in values && values.isVisible != null) {
      existingAdornment.setVisibility(values.isVisible)
    }

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
