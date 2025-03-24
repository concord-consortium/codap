import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { IAdornmentModel } from "../../adornment-models"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { isStandardDeviationAdornment } from "./standard-deviation-adornment-model"
import { kStandardDeviationType } from "./standard-deviation-adornment-types"

export const standardDeviationAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isStandardDeviationAdornment(adornment)) return adornmentMismatchResult(kStandardDeviationType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      const cellKeyString = JSON.stringify(cellKey)
      const mean = adornment.measures.get(cellKeyString)?.value ?? NaN
      const { min, max } = adornment.computeMeasureRange(primaryAttrId, cellKey, dataConfig)
      const dataItem: AdornmentData = { mean, min, max }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  }
}
