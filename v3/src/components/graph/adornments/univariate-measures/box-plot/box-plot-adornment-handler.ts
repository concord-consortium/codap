import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isBoxPlotAdornment } from "./box-plot-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kBoxPlotType } from "./box-plot-adornment-types"

export const boxPlotAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isBoxPlotAdornment(adornment)) return adornmentMismatchResult(kBoxPlotType)

    const { showICI, showOutliers } = adornment
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    for (const cellKey of cellKeys) {
      const { median, minWhiskerValue: lower, maxWhiskerValue: upper,
        lowerQuartile, upperQuartile } = adornment.getBoxPlotParams(cellKey)
      const interquartileRange = upperQuartile - lowerQuartile
      const dataItem: AdornmentData = {
        interquartileRange,
        lower,
        lowerQuartile,
        median,
        upper,
        upperQuartile
      }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data, showICI, showOutliers }
  }
}
