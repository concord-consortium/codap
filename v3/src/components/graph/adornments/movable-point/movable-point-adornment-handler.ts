import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { cellKeyToString } from "../../utilities/cell-key-utils"
import { IAdornmentModel } from "../adornment-models"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories } from "../utilities/adornment-handler-utils"
import { isMovablePointAdornment } from "./movable-point-adornment-model"
import { kMovablePointType } from "./movable-point-adornment-types"

export const movablePointAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMovablePointAdornment(adornment)) return adornmentMismatchResult(kMovablePointType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig.getAllCellKeys()
    const xAttrId = dataConfig.attributeID("x") || ""
    const yAttrId = dataConfig.attributeID("y") || ""
    const xAttr = dataConfig.dataset?.getAttribute(xAttrId)
    const yAttr = dataConfig.dataset?.getAttribute(yAttrId)
    const xAttrName = xAttr?.name ?? ""
    const yAttrName = yAttr?.name ?? ""
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = cellKeyToString(cellKey)
      const point = adornment.points.get(cellKeyString)
      if (!point) continue
    
      const { x, y } = point
      const dataItem: AdornmentData = { [xAttrName]: x, [yAttrName]: y }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  }
}
