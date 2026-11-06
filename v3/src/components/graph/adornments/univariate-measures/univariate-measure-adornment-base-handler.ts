import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { cellKeyToString } from "../../utilities/cell-key-utils"
import { IAdornmentModel } from "../adornment-models"
import { AdornmentData, cellKeyToCategories, adornmentMismatchResult } from "../utilities/adornment-handler-utils"
import { adornmentWriteHandlers } from "../utilities/adornment-write-handlers"
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

  function get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
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
  }

  return { get, ...adornmentWriteHandlers({ adornmentType, get }) }
}
