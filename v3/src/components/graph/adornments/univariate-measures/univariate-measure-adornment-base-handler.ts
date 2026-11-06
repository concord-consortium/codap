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

export interface IUnivariateMeasureAdornmentWriteConfig {
  adornmentType: string
  // the adornment's `get` values, with which `create` also replies
  get: (adornment: IAdornmentModel, graphContent: IGraphContentModel) => Record<string, any>
  // sets the type's own display settings from `create` or `update` values
  applyValues?: (adornment: IAdornmentModel, values: Record<string, unknown>, graphContent: IGraphContentModel) => void
}

// `create` and `update` for a univariate measure: `create` shows the adornment, adding it to the graph if
// it has never been shown, and `update` sets its visibility. Both apply the type's own display settings.
export const univariateMeasureAdornmentWriteHandlers = (
  { adornmentType, get, applyValues }: IUnivariateMeasureAdornmentWriteConfig
): Pick<DIAdornmentHandler, "create" | "update"> => ({
  create({ graphContent, values }) {
    if (!isCompatibleWithPlotType(adornmentType, graphContent.plotType)) return adornmentNotSupportedByPlotTypeResult

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const existingAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(adornmentType)
    const adornment = existingAdornment ?? getAdornmentContentInfo(adornmentType).modelClass.create()

    if (!existingAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    adornment.setVisibility(true)
    const settings = valuesObject(values)
    if (settings) applyValues?.(adornment, settings, graphContent)

    const { id, isVisible, type } = adornment
    return { success: true, values: { id, isVisible, type, ...get(adornment, graphContent) } }
  },

  update({ graphContent, values }) {
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(adornmentType)
    if (!existingAdornment) return adornmentNotFoundResult

    const settings = valuesObject(values)
    if (settings) {
      if (typeof settings.isVisible === "boolean") existingAdornment.setVisibility(settings.isVisible)
      applyValues?.(existingAdornment, settings, graphContent)
    }

    return { success: true }
  }
})

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

  return { get, ...univariateMeasureAdornmentWriteHandlers({ adornmentType, get }) }
}

function valuesObject(values: unknown) {
  return values != null && typeof values === "object" ? values as Record<string, unknown> : undefined
}
