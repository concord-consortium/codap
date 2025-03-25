import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isCountAdornment } from "./count-adornment-model"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { kCountType } from "./count-adornment-types"

export const countAdornmentHandler: DIAdornmentHandler = {
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
  }
}
