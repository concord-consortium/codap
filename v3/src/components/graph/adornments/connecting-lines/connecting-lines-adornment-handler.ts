import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { isAdornmentValues } from "../../../../data-interactive/data-interactive-adornment-types"
import { adornmentNotSupportedByPlotTypeResult } from "../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { isCompatibleWithPlotType } from "../adornment-content-info"
import { kConnectingLinesType } from "./connecting-lines-adornment-types"

export const connectingLinesAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent, values } = args
    if (!isCompatibleWithPlotType(kConnectingLinesType, graphContent.plotType)) {
      return adornmentNotSupportedByPlotTypeResult
    }

    const isVisible = isAdornmentValues(values) && "isVisible" in values && values.isVisible !== null
      ? !!values.isVisible
      : true

    graphContent.adornmentsStore.setShowConnectingLines(isVisible)

    return { 
      success: true, 
      values: { 
        id: "connecting-lines", 
        isVisible: graphContent.adornmentsStore.showConnectingLines, 
        type: kConnectingLinesType 
      } 
    }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    return { 
      id: "connecting-lines",
      isVisible: graphContent.adornmentsStore.showConnectingLines, 
      type: kConnectingLinesType 
    }
  },

  update(args) {
    const { graphContent, values } = args

    if (isAdornmentValues(values) && "isVisible" in values && values.isVisible != null) {
      graphContent.adornmentsStore.setShowConnectingLines(values.isVisible)
    }

    return { success: true }
  },

  delete(args) {
    const { graphContent } = args

    graphContent.adornmentsStore.setShowConnectingLines(false)
    return { success: true }
  }
}
