import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isCountAdornment } from "./count-adornment-model"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { kCountType } from "./count-adornment-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { scaleLinear } from "d3"

const createScale = (dataConfig: IGraphDataConfigurationModel) => {
  const primaryRole = dataConfig?.primaryRole ?? "x"
  const attrType = dataConfig?.attributeType(primaryRole)
  const attrId = dataConfig?.attributeID(primaryRole)
  if (!attrId) return null

  const cases = dataConfig?.dataset?.getCasesForAttributes([attrId]) || []
  const values = cases.map(c => dataConfig?.dataset?.getNumeric(c.__id__, attrId)).filter(v => v !== undefined)
  if (values.length === 0) return null

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  if (attrType === "numeric") {
    return scaleLinear().domain([minValue, maxValue]).range([0, 1])
  }
  return null
}

export const countAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isCountAdornment(adornment)) return adornmentMismatchResult(kCountType)

    const { percentType, showCount, showPercent } = adornment
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig.getAllCellKeys()
    const data: AdornmentData[] = []
    const scale = createScale(dataConfig)

    for (const cellKey of cellKeys) {
      const dataItem: AdornmentData = {}
      if (!scale) return { success: false, values: { error: "Failed to create scale" } }

      const subPlotRegionBoundaries =
        graphContent.adornmentsStore?.subPlotRegionBoundaries(JSON.stringify(cellKey), scale)

      const regionCounts = adornment.computeRegionCounts({
        cellKey,
        dataConfig,
        inclusiveMax: false,
        plotHeight: 0,
        plotWidth: 0,
        scale,
        subPlotRegionBoundaries,
        isBinnedDotPlot: false,
        showCount,
        showPercent
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
