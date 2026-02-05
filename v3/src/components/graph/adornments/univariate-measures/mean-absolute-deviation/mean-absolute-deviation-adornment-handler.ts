import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { cellKeyToString } from "../../../utilities/cell-key-utils"
import { IAdornmentModel } from "../../adornment-models"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { isMeanAbsoluteDeviationAdornment } from "./mean-absolute-deviation-adornment-model"
import { kMeanAbsoluteDeviationType } from "./mean-absolute-deviation-adornment-types"

export const meanAbsoluteDeviationAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMeanAbsoluteDeviationAdornment(adornment)) return adornmentMismatchResult(kMeanAbsoluteDeviationType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const primaryAttrId = dataConfig?.primaryAttributeID

    for (const cellKey of cellKeys) {
      const cellKeyString = cellKeyToString(cellKey)
      const mean = adornment.measures.get(cellKeyString)?.value ?? NaN
      const { min, max } = adornment.computeMeasureRange(primaryAttrId, cellKey, dataConfig)
      const dataItem: AdornmentData = { mean, min, max }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { id: adornment.id, data }
  }
}
