import { getSnapshot } from "@concord-consortium/mobx-state-tree"
import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isCountAdornment } from "./count-adornment-model"
import { percentString } from "../../utilities/graph-utils"

export const countAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isCountAdornment(adornment)) return { success: false, values: { error: "Not a count adornment" } }

    const adornmentSnapshot = getSnapshot(adornment)
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const caseCountMap: Record<string, number> = {}
    const percentMap: Record<string, string> = {}

    for (const cellKey of cellKeys) {
      const subPlotCases = dataConfig.subPlotCases(cellKey)
      const key = JSON.stringify(cellKey)
      if (adornment.showCount) {
        caseCountMap[key] = subPlotCases.length
      }
      if (adornment.showPercent) {
        percentMap[key] = percentString(adornment.percentValue(subPlotCases.length, cellKey, dataConfig))
      }
    }

    return {
      ...adornmentSnapshot,
      countValues: caseCountMap,
      percentValues: percentMap
    }
  }
}
