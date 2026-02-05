import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { cellKeyToString } from "../../../utilities/cell-key-utils"
import { IAdornmentModel } from "../../adornment-models"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { isStandardErrorAdornment } from "./standard-error-adornment-model"
import { kStandardErrorType } from "./standard-error-adornment-types"

export const standardErrorAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isStandardErrorAdornment(adornment)) return adornmentMismatchResult(kStandardErrorType)

    const { _numStErrs } = adornment
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      const cellKeyString = cellKeyToString(cellKey)
      const standardError = adornment.measures.get(cellKeyString)?.value ?? NaN
      const { min, max } = adornment.computeMeasureRange(primaryAttrId, cellKey, dataConfig)
      const dataItem: AdornmentData = { standardError, min, max }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data, _numStErrs }
  }
}
