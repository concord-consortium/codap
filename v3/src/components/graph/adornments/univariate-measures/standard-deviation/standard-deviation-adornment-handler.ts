import { isAdornmentValues } from "../../../../../data-interactive/data-interactive-adornment-types"
import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult }
  from "../../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { getAdornmentContentInfo, isCompatibleWithPlotType } from "../../adornment-content-info"
import { IAdornmentModel } from "../../adornment-models"
import { IAdornmentsBaseStore } from "../../store/adornments-base-store"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kMeanType } from "../mean/mean-adornment-types"
import { isStandardDeviationAdornment, IStandardDeviationAdornmentModel } from "./standard-deviation-adornment-model"
import { kStandardDeviationType } from "./standard-deviation-adornment-types"

export const standardDeviationAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const isAdornmentSupported = isCompatibleWithPlotType(kMeanType, graphContent.plotType)
    if (!isAdornmentSupported) return adornmentNotSupportedByPlotTypeResult

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingMedianAdornment =
      adornmentsStore.findAdornmentOfType<IStandardDeviationAdornmentModel>(kStandardDeviationType)
    const componentContentInfo = getAdornmentContentInfo(kStandardDeviationType)
    const adornment =
      existingMedianAdornment ?? componentContentInfo.modelClass.create() as IStandardDeviationAdornmentModel

    if (!existingMedianAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    adornment.setVisibility(true)

    for (const cellKey of cellKeys) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      const cellKeyString = JSON.stringify(cellKey)
      const mean = adornment.measures.get(cellKeyString)?.value ?? NaN
      const { min, max } = adornment.computeMeasureRange(primaryAttrId, cellKey, dataConfig)
      const dataItem: AdornmentData = { mean, min, max }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    const { id, isVisible, type } = adornment
    return { success: true, values: { id, isVisible, type, data } }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isStandardDeviationAdornment(adornment)) return adornmentMismatchResult(kStandardDeviationType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      const cellKeyString = JSON.stringify(cellKey)
      const mean = adornment.measures.get(cellKeyString)?.value ?? NaN
      const { min, max } = adornment.computeMeasureRange(primaryAttrId, cellKey, dataConfig)
      const dataItem: AdornmentData = { mean, min, max }
    
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
    const existingMeanAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(kStandardDeviationType)
    if (!existingMeanAdornment) return adornmentNotFoundResult

    if (isAdornmentValues(values) && "isVisible" in values && values.isVisible != null) {
      existingMeanAdornment.setVisibility(values.isVisible)
    }

    return { success: true }
  }
}
