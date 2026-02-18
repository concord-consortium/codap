import { DIAdornmentValues, DILsrlAdornmentValues, isAdornmentValues }
  from "../../../../data-interactive/data-interactive-adornment-types"
import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult }
  from "../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../models/graph-content-model"
import { cellKeyToString } from "../../utilities/cell-key-utils"
import { getAdornmentContentInfo, isCompatibleWithPlotType } from "../adornment-content-info"
import { IAdornmentModel } from "../adornment-models"
import { IAdornmentsBaseStore } from "../store/adornments-base-store"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { ILSRLAdornmentModel, isLSRLAdornment } from "./lsrl-adornment-model"
import { kLSRLType } from "./lsrl-adornment-types"

const setAdornmentProperties = (adornment: ILSRLAdornmentModel, values: DIAdornmentValues) => {
  if (isAdornmentValues(values)) {
    const { isVisible, showConfidenceBands, showR, showRSquared, equationForm } = values as DILsrlAdornmentValues
    if (isVisible != null) {
      adornment.setVisibility(isVisible)
    }
    if (showConfidenceBands != null) {
      adornment.setShowConfidenceBands(showConfidenceBands)
    }
    if (showR != null) {
      adornment.setShowR(showR)
    }
    if (showRSquared != null) {
      adornment.setShowRSquared(showRSquared)
    }
    if (equationForm != null) {
      adornment.setEquationForm(equationForm)
    }
  }
}

export const lsrlAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent, values } = args

    if (!isCompatibleWithPlotType(kLSRLType, graphContent.plotType)) {
      return adornmentNotSupportedByPlotTypeResult
    }

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingLsrlAdornment = adornmentsStore.findAdornmentOfType<ILSRLAdornmentModel>(kLSRLType)
    const componentContentInfo = getAdornmentContentInfo(kLSRLType)
    const adornment = existingLsrlAdornment ?? componentContentInfo.modelClass.create() as ILSRLAdornmentModel

    if (isAdornmentValues(values)) {
      const createValues = { ...values, isVisible: true }
      setAdornmentProperties(adornment, createValues)
    }

    if (!existingLsrlAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    for (const cellKey of cellKeys) {
      const cellKeyString = cellKeyToString(cellKey)
      const linesMap = adornment.lines?.get(cellKeyString)
      if (!linesMap) continue
    
      const line = linesMap.get("__main__")
      if (!line) continue
    
      const { category, intercept, rSquared, sdResiduals, slope } = line
      const dataItem: AdornmentData = {
        category,
        intercept,
        rSquared,
        sdResiduals,
        slope
      }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    const { id, isVisible, showConfidenceBands, showR, showRSquared, equationForm, type } = adornment
    const resultValues = { id, isVisible, showConfidenceBands, showR, showRSquared, equationForm, type, data }
    return { success: true, values: resultValues }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isLSRLAdornment(adornment))  return adornmentMismatchResult(kLSRLType)

    const { showConfidenceBands, showR, showRSquared, equationForm } = adornment
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = cellKeyToString(cellKey)
      const linesMap = adornment.lines.get(cellKeyString)
      if (!linesMap) continue
    
      const line = linesMap.get("__main__")
      if (!line) continue
    
      const { category, intercept, rSquared, sdResiduals, slope } = line
      const dataItem: AdornmentData = {
        category,
        intercept,
        rSquared,
        sdResiduals,
        slope
      }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data, showConfidenceBands, showR, showRSquared, equationForm }
  },

  update(args) {
    const { graphContent, values } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingLsrlAdornment = adornmentsStore.findAdornmentOfType<ILSRLAdornmentModel>(kLSRLType)
    if (!existingLsrlAdornment) return adornmentNotFoundResult

    if (isAdornmentValues(values)) {
      setAdornmentProperties(existingLsrlAdornment, values)
    }

    return { success: true }
  }
}

