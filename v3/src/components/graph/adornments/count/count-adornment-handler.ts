import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isCountAdornment } from "./count-adornment-model"
import { percentString } from "../../utilities/graph-utils"
import { AdornmentData, cellKeyToCategories } from "../utilities/adornment-handler-utils"

export const countAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isCountAdornment(adornment)) return { success: false, values: { error: "Not a count adornment" } }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData<any>[] = []

    for (const cellKey of cellKeys) {
      const subPlotCases = dataConfig.subPlotCases(cellKey)
      const dataItem: AdornmentData<any> = {
        count: subPlotCases.length,
        percent: percentString(adornment.percentValue(subPlotCases.length, cellKey, dataConfig))
      }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { id: adornment.id, data }
  }
}
