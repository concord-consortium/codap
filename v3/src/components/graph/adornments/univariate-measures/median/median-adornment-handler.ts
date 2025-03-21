import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isMedianAdornment } from "./median-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kMedianType } from "./median-adornment-types"

export const medianAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMedianAdornment(adornment)) return { success: false, values: { error: `Not a ${kMedianType} adornment` } }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const median = adornment.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { median }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  }
}
