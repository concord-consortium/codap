import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isBoxPlotAdornment } from "./box-plot-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kBoxPlotType } from "./box-plot-adornment-types"

export const boxPlotAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isBoxPlotAdornment(adornment)) return { success: false, values: { error: `Not a ${kBoxPlotType} adornment` } }

    const { showICI, showOutliers } = adornment
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      const cellKeyString = JSON.stringify(cellKey)
      const cellCaseValues = adornment.getCaseValues(primaryAttrId, cellKey, dataConfig)
      const median = adornment.measures.get(cellKeyString)?.value ?? NaN
      const lower = adornment.minWhiskerValue(primaryAttrId, cellKey, dataConfig)
      const upper = adornment.maxWhiskerValue(primaryAttrId, cellKey, dataConfig)
      const lowerQuartile = adornment.lowerQuartile(cellCaseValues)
      const upperQuartile = adornment.upperQuartile(cellCaseValues)
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
