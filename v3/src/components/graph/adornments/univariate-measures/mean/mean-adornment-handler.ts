import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isMeanAdornment } from "./mean-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kMeanType } from "./mean-adornment-types"

export const meanAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMeanAdornment(adornment)) return { success: false, values: { error: `Not a ${kMeanType} adornment` } }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const mean = adornment.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { mean }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  }
}
