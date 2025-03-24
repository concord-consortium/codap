import { DIAdornmentValues, DICountAdornmentValues, isAdornmentValues }
  from "../../../../data-interactive/data-interactive-adornment-types"
import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult } from "../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../models/graph-content-model"
import { percentString } from "../../utilities/graph-utils"
import { IAdornmentModel } from "../adornment-models"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { IAdornmentsBaseStore } from "../store/adornments-base-store"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { ICountAdornmentModel, isCountAdornment } from "./count-adornment-model"
import { kCountType } from "./count-adornment-types"

const setAdornmentProperties = (adornment: ICountAdornmentModel, values: DIAdornmentValues) => {
  if (isAdornmentValues(values)) {
    const { isVisible, showCount, showPercent, percentType } = values as DICountAdornmentValues
    if (isVisible !== undefined) {
      adornment.setVisibility(isVisible)
    }
    if (showCount !== undefined) {
      adornment.setShowCount(showCount)
    }
    if (showPercent !== undefined) {
      adornment.setShowPercent(showPercent)
    }
    if (percentType !== undefined) {
      adornment.setPercentType(percentType)
    }
  }
}

export const countAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent, values } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingCountAdornment = adornmentsStore.findAdornmentOfType<ICountAdornmentModel>(kCountType)
    const componentContentInfo = getAdornmentContentInfo(kCountType)
    const adornment = existingCountAdornment ?? componentContentInfo.modelClass.create() as ICountAdornmentModel

    if (isAdornmentValues(values)) {
      setAdornmentProperties(adornment, values)
    }

    if (!existingCountAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    adornment.setVisibility(true)

    const { id, isVisible, showCount, showPercent, percentType, type } = adornment

    for (const cellKey of cellKeys) {
      const subPlotCases = dataConfig.subPlotCases(cellKey)
      const dataItem: AdornmentData = {}
      
      if (showCount) {
        dataItem.count = subPlotCases.length
      }

      if (showPercent) {
        dataItem.percent = percentString(adornment.percentValue(subPlotCases.length, cellKey, dataConfig))
      }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { success: true, values: { id, isVisible, showCount, showPercent, percentType, type, data }}
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isCountAdornment(adornment)) return adornmentMismatchResult(kCountType)

    const { percentType, showCount, showPercent } = adornment
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const dataItem: AdornmentData = {}

      const subPlotRegionBoundaries = graphContent.adornmentsStore?.subPlotRegionBoundaries(JSON.stringify(cellKey))

      const regionCounts = adornment.computeRegionCounts({
        cellKey,
        dataConfig,
        inclusiveMax: false,
        plotHeight: 0,
        plotWidth: 0,
        subPlotRegionBoundaries
      })

      const regionCountValues = regionCounts.map(c => c.count)
      const regionPercentValues = regionCounts.map(c => c.percent)

      if (showCount) {
        dataItem.count = regionCountValues.length > 1
          ? regionCountValues.filter((value): value is number => value !== undefined)
          : regionCountValues[0]
      }

      if (showPercent) {
        dataItem.percent = regionPercentValues.length > 1
          ? regionPercentValues.filter((value): value is string => value !== undefined)
          : regionPercentValues[0]
      }

      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }

      data.push(dataItem)
    }

    return { data, percentType, showCount, showPercent }
  },

  update(args) {
    const { graphContent, values } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingCountAdornment = adornmentsStore.findAdornmentOfType<ICountAdornmentModel>(kCountType)
    if (!existingCountAdornment) return adornmentNotFoundResult

    if (isAdornmentValues(values)) {
      setAdornmentProperties(existingCountAdornment, values)
    }

    return { success: true }
  }
}
