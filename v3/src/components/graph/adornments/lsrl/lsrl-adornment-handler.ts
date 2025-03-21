import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../adornment-models"
import { isLSRLAdornment } from "./lsrl-adornment-model"
import { IGraphContentModel } from "../../models/graph-content-model"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { kLSRLType } from "./lsrl-adornment-types"

export const lsrlAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isLSRLAdornment(adornment))  return adornmentMismatchResult(kLSRLType)

    const { showConfidenceBands } = adornment
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const linesMap = adornment.lines.get(cellKeyString)
      if (!linesMap) continue
    
      const line = linesMap.get("__main__")
      if (!line) continue
    
      const { category, intercept, rSquared, sdResiduals, slope } = line
      const dataItem: AdornmentData = {
        category,
        intercept,
        rSquared,
        sdResiduals,
        slope
      }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data, showConfidenceBands }
  }
}

