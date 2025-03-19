import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isStandardErrorAdornment } from "./standard-error-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kStandardErrorType } from "./standard-error-adornment-types"

export const standardErrorAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isStandardErrorAdornment(adornment)) {
      return { success: false, values: { error: `Not a ${kStandardErrorType} adornment` } }
    }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      const cellKeyString = JSON.stringify(cellKey)
      const standardError = adornment.measures.get(cellKeyString)?.value ?? NaN
      const { min, max } = adornment.computeMeasureRange(primaryAttrId, cellKey, dataConfig)
      const dataItem: AdornmentData = { standardError, min, max }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { id: adornment.id, data }
  }
}
