import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isMovableLineAdornment } from "./movable-line-adornment-model"
import { AdornmentData, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { kMovableLineType } from "./movable-line-adornment-types"

export const movableLineAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMovableLineAdornment(adornment)) {
      return { success: false, values: { error: `Not a ${kMovableLineType} adornment` } }
    }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const line = adornment.lines.get(cellKeyString)
      if (!line) continue
    
      const { intercept, slope } = line
      const dataItem: AdornmentData = { intercept, slope }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { id: adornment.id, data }
  }
}
