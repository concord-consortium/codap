import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isMovableValueAdornment } from "./movable-value-adornment-model"
import { AdornmentData, cellKeyToCategories } from "../utilities/adornment-handler-utils"

export const movableValueAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMovableValueAdornment(adornment)) {
      return { success: false, values: { error: "Not a movable value adornment" } }
    }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData<any>[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const movableValues = adornment.values.get(cellKeyString)
      const values = movableValues ? Object.values(movableValues).map(value => value) : []
      const dataItem: AdornmentData<any> = { movableValues: values }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { id: adornment.id, data }
  }
}
