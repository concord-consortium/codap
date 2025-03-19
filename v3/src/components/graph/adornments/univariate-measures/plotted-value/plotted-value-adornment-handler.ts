import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isPlottedValueAdornment } from "./plotted-value-adornment-model"
import { IGraphContentModel } from "../../../models/graph-content-model"
import { AdornmentData, cellKeyToCategories } from "../../utilities/adornment-handler-utils"
import { kPlottedValueType } from "./plotted-value-adornment-types"

export const plottedValueAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isPlottedValueAdornment(adornment)) {
      return { success: false, values: { error: `Not a ${kPlottedValueType} adornment` } }
    }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const plottedValue = adornment.measures.get(cellKeyString)?.value ?? NaN
      const dataItem: AdornmentData = { plottedValue }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { id: adornment.id, data }
  }
}
