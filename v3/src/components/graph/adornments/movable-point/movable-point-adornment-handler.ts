import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { cellKeyToString } from "../../utilities/cell-key-utils"
import { IAdornmentModel } from "../adornment-models"
import {
  AdornmentData, adornmentMismatchResult, cellKeyToCategories, numberValuesError
} from "../utilities/adornment-handler-utils"
import { adornmentWriteHandlers } from "../utilities/adornment-write-handlers"
import { isMovablePointAdornment } from "./movable-point-adornment-model"
import { kMovablePointType } from "./movable-point-adornment-types"

function get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
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

// `x` and `y` set the point in every cell, as one value for the whole graph
function applyValues(adornment: IAdornmentModel, values: Record<string, unknown>, graphContent: IGraphContentModel) {
  if (!isMovablePointAdornment(adornment)) return
  const { x, y } = values as { x?: number, y?: number }
  if (x == null && y == null) return
  graphContent.dataConfiguration.getAllCellKeys().forEach(cellKey => {
    const key = adornment.instanceKey(cellKey)
    const point = adornment.points.get(key)
    if (point) adornment.setPoint({ x: x ?? point.x, y: y ?? point.y }, key)
  })
}

export const movablePointAdornmentHandler: DIAdornmentHandler = {
  get,
  ...adornmentWriteHandlers({
    adornmentType: kMovablePointType, get, applyValues,
    validate: values => numberValuesError(values, ["x", "y"])
  })
}
