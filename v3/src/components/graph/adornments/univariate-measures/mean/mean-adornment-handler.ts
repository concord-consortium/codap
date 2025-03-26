import { isAdornmentValues } from "../../../../../data-interactive/data-interactive-adornment-types"
import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult }
  from "../../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { getAdornmentContentInfo, isCompatibleWithPlotType } from "../../adornment-content-info"
import { IAdornmentModel } from "../../adornment-models"
import { IAdornmentsBaseStore } from "../../store/adornments-base-store"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { IMeanAdornmentModel, isMeanAdornment } from "./mean-adornment-model"
import { kMeanType } from "./mean-adornment-types"

export const meanAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent } = args
    const isAdornmentSupported = isCompatibleWithPlotType(kMeanType, graphContent.plotType)
    if (!isAdornmentSupported) return adornmentNotSupportedByPlotTypeResult

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingMeanAdornment = adornmentsStore.findAdornmentOfType<IMeanAdornmentModel>(kMeanType)
    const componentContentInfo = getAdornmentContentInfo(kMeanType)
    const adornment = existingMeanAdornment ?? componentContentInfo.modelClass.create() as IMeanAdornmentModel

    if (!existingMeanAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    adornment.setVisibility(true)

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const mean = adornment.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { mean }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    const { id, isVisible, type } = adornment
    return { success: true, values: { id, isVisible, type, data } }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMeanAdornment(adornment)) return adornmentMismatchResult(kMeanType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const mean = adornment.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { mean }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  },

  update(args) {
    const { graphContent, values } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingMeanAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(kMeanType)
    if (!existingMeanAdornment) return adornmentNotFoundResult

    if (isAdornmentValues(values) && "isVisible" in values && values.isVisible != null) {
      existingMeanAdornment.setVisibility(values.isVisible)
    }

    return { success: true }
  }
}
