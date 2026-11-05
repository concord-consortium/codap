import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isBoxPlotAdornment } from "./box-plot-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kBoxPlotType } from "./box-plot-adornment-types"
import { adornmentWriteHandlers } from "../../utilities/adornment-write-handlers"

function get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
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

// `showOutliers` and `showICI` (the informal confidence interval), as set in the graph's inspector
function applyValues(adornment: IAdornmentModel, values: Record<string, unknown>) {
  if (!isBoxPlotAdornment(adornment)) return
  const { showICI, showOutliers } = values
  if (typeof showOutliers === "boolean") adornment.setShowOutliers(showOutliers)
  if (typeof showICI === "boolean") adornment.setShowICI(showICI)
}

export const boxPlotAdornmentHandler: DIAdornmentHandler = {
  get,
  ...adornmentWriteHandlers({ adornmentType: kBoxPlotType, get, applyValues })
}
