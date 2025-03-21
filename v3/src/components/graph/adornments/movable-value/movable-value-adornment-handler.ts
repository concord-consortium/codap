import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isMovableValueAdornment } from "./movable-value-adornment-model"
import { AdornmentData, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { kMovableValueType } from "./movable-value-adornment-types"

export const movableValueAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMovableValueAdornment(adornment)) {
      return { success: false, values: { error: `Not a ${kMovableValueType} adornment` } }
    }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const movableValues = adornment.values.get(cellKeyString)
      const values = movableValues ? Object.values(movableValues) : []
      const dataItem: AdornmentData = { movableValues: values }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  }
}
