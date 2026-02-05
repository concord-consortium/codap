import { isAdornmentValues } from "../../../../data-interactive/data-interactive-adornment-types"
import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult }
  from "../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { cellKeyToString } from "../../utilities/cell-key-utils"
import { getAdornmentContentInfo, isCompatibleWithPlotType } from "../adornment-content-info"
import { IAdornmentModel } from "../adornment-models"
import { IAdornmentsBaseStore } from "../store/adornments-base-store"
import { AdornmentData, cellKeyToCategories, adornmentMismatchResult } from "../utilities/adornment-handler-utils"
import { IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"

export interface IUnivariateMeasureAdornmentHandlerConfig {
  adornmentType: string
  isAdornmentOfType: (adornment: IAdornmentModel) => boolean
  measureName: string
  getMeasureValue: (adornment: IUnivariateMeasureAdornmentModel, cellKeyString: string) => number
  getAdditionalData?: (
    adornment: IAdornmentModel,
    cellKey: Record<string, string>,
    dataConfig: IGraphDataConfigurationModel
  ) => Record<string, any> | undefined
}

export const univariateMeasureAdornmentBaseHandler = (
  config: IUnivariateMeasureAdornmentHandlerConfig
): DIAdornmentHandler => {
  const { adornmentType, isAdornmentOfType, measureName, getMeasureValue, getAdditionalData } = config
  return {
    create(args) {
      const { graphContent } = args
      if (!isCompatibleWithPlotType(adornmentType, graphContent.plotType)) return adornmentNotSupportedByPlotTypeResult

      const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
      const dataConfig = graphContent.dataConfiguration
      const cellKeys = dataConfig?.getAllCellKeys()
      const data: AdornmentData[] = []
      const existingAdornment = adornmentsStore.findAdornmentOfType<IUnivariateMeasureAdornmentModel>(adornmentType)
      const componentContentInfo = getAdornmentContentInfo(adornmentType)
      const adornment =
        existingAdornment ?? componentContentInfo.modelClass.create() as IUnivariateMeasureAdornmentModel

      if (!existingAdornment) {
        adornmentsStore.addAdornment(adornment, { dataConfig })
      }

      adornment.setVisibility(true)

      for (const cellKey of cellKeys) {
        const cellKeyString = cellKeyToString(cellKey)
        const measureValue = getMeasureValue(adornment, cellKeyString)
        const additionalData = getAdditionalData?.(adornment, cellKey, dataConfig) ?? {}
        const dataItem: AdornmentData = {
          ...additionalData,
          [measureName]: measureValue
        }
      
        if (Object.keys(cellKey).length > 0) {
          dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
        }
      
        data.push(dataItem)
      }

      const { id, isVisible, type } = adornment
      return { success: true, values: { id, isVisible, type, data } }
    },

    get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
      if (!isAdornmentOfType(adornment)) return adornmentMismatchResult(adornmentType)

      const dataConfig = graphContent.dataConfiguration
      const cellKeys = dataConfig?.getAllCellKeys()
      const data: AdornmentData[] = []

      for (const cellKey of cellKeys) {
        const cellKeyString = cellKeyToString(cellKey)
        const measureValue = getMeasureValue(adornment as IUnivariateMeasureAdornmentModel, cellKeyString)
        const additionalData = getAdditionalData?.(adornment, cellKey, dataConfig) ?? {}
        const dataItem: AdornmentData = {
          ...additionalData,
          [measureName]: measureValue
        }
      
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
      const existingAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(adornmentType)
      if (!existingAdornment) return adornmentNotFoundResult

      if (isAdornmentValues(values) && "isVisible" in values && values.isVisible != null) {
        existingAdornment.setVisibility(values.isVisible)
      }

      return { success: true }
    }
  }
}
