import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { cellKeyToString } from "../../utilities/cell-key-utils"
import { IAdornmentModel } from "../adornment-models"
import {
  AdornmentData, adornmentMismatchResult, cellKeyToCategories, numberValuesError
} from "../utilities/adornment-handler-utils"
import { adornmentWriteHandlers } from "../utilities/adornment-write-handlers"
import { isMovableLineAdornment } from "./movable-line-adornment-model"
import { kMovableLineType } from "./movable-line-adornment-types"

function get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
  if (!isMovableLineAdornment(adornment)) return adornmentMismatchResult(kMovableLineType)

  const dataConfig = graphContent.dataConfiguration
  const cellKeys = dataConfig?.getAllCellKeys()
  const data: AdornmentData[] = []

  for (const cellKey of cellKeys) {
    const cellKeyString = cellKeyToString(cellKey)
    const line = adornment.lines.get(cellKeyString)
    if (!line) continue

    const { intercept, slope } = line
    const dataItem: AdornmentData = { intercept, slope }

    if (Object.keys(cellKey).length > 0) {
      dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
    }

    data.push(dataItem)
  }

  return { data }
}

// `slope` and `intercept` set the line in every cell, as one value for the whole graph. A locked intercept
// stays at 0, as in the graph's inspector.
function applyValues(adornment: IAdornmentModel, values: Record<string, unknown>, graphContent: IGraphContentModel) {
  if (!isMovableLineAdornment(adornment)) return
  const { slope, intercept } = values as { slope?: number, intercept?: number }
  if (slope == null && intercept == null) return
  const { interceptLocked } = graphContent.adornmentsStore
  graphContent.dataConfiguration.getAllCellKeys().forEach(cellKey => {
    const key = adornment.instanceKey(cellKey)
    const line = adornment.lines.get(key)
    if (!line) return
    adornment.setLine({
      slope: slope ?? line.slope,
      intercept: interceptLocked ? 0 : intercept ?? line.intercept,
      equationCoords: line.equationCoords
    }, key)
  })
}

export const movableLineAdornmentHandler: DIAdornmentHandler = {
  get,
  ...adornmentWriteHandlers({
    adornmentType: kMovableLineType, get, applyValues,
    validate: values => numberValuesError(values, ["slope", "intercept"])
  })
}
