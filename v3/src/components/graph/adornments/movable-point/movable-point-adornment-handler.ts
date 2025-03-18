import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isMovablePointAdornment } from "./movable-point-adornment-model"
import { AdornmentData, cellKeyToCategories } from "../utilities/adornment-handler-utils"

export const movablePointAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMovablePointAdornment(adornment)) {
      return { success: false, values: { error: "Not a movable point adornment" } }
    }

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const allAttributes = dataConfig?.dataset?.attributes
    const xAttrId = dataConfig?.attributeID("x") || ""
    const yAttrId = dataConfig?.attributeID("y") || ""
    const xAttr = allAttributes?.find(attr => attr.id === xAttrId)
    const yAttr = allAttributes?.find(attr => attr.id === yAttrId)
    const xAttrName = xAttr?.name ?? ""
    const yAttrName = yAttr?.name ?? ""
    const data: AdornmentData<any>[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const point = adornment.points.get(cellKeyString)
      if (!point) continue
    
      const { x, y } = point
      const dataItem: AdornmentData<any> = { [xAttrName]: x, [yAttrName]: y }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { id: adornment.id, data }
  }
}
