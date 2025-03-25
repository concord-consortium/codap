import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isNormalCurveAdornment } from "./normal-curve-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kNormalCurveType } from "./normal-curve-adornment-types"

export const normalCurveAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isNormalCurveAdornment(adornment)) return adornmentMismatchResult(kNormalCurveType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      const mean = adornment.computeMean(primaryAttrId, cellKey, dataConfig)
      const standardDeviation = adornment.computeStandardDeviation(primaryAttrId, cellKey, dataConfig)
      const standardError = adornment.computeStandardError(primaryAttrId, cellKey, dataConfig)
      const dataItem: AdornmentData = { mean, standardDeviation, standardError }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  }
}
