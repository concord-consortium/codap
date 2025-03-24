import { isAdornmentValues } from "../../../../../data-interactive/data-interactive-adornment-types"
import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult }
  from "../../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { IAdornmentModel } from "../../adornment-models"
import { IAdornmentsBaseStore } from "../../store/adornments-base-store"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories, isAdornmentSupportedByPlotType }
  from "../../utilities/adornment-handler-utils"
import { kMeanType } from "../mean/mean-adornment-types"
import { IMedianAdornmentModel, isMedianAdornment } from "./median-adornment-model"
import { kMedianType } from "./median-adornment-types"

export const medianAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent } = args
    const isAdornmentSupported = isAdornmentSupportedByPlotType(kMeanType, graphContent.plotType)
    if (!isAdornmentSupported) return adornmentNotSupportedByPlotTypeResult

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingMedianAdornment = adornmentsStore.findAdornmentOfType<IMedianAdornmentModel>(kMedianType)
    const componentContentInfo = getAdornmentContentInfo(kMedianType)
    const adornment = existingMedianAdornment ?? componentContentInfo.modelClass.create() as IMedianAdornmentModel

    if (!existingMedianAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    adornment.setVisibility(true)

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const median = adornment.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { median }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    const { id, isVisible, type } = adornment
    return { success: true, values: { id, isVisible, type, data } }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMedianAdornment(adornment)) return adornmentMismatchResult(kMedianType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const median = adornment.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { median }
    
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
    const existingMeanAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(kMedianType)
    if (!existingMeanAdornment) return adornmentNotFoundResult

    if (isAdornmentValues(values) && "isVisible" in values && values.isVisible !== undefined) {
      existingMeanAdornment.setVisibility(values.isVisible)
    }

    return { success: true }
  }
}
