import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { connectingLinesAdornmentHandler } from "./connecting-lines-adornment-handler"
import { ConnectingLinesAdornmentModel } from "./connecting-lines-adornment-model"
import { kConnectingLinesType } from "./connecting-lines-adornment-types"

registerAdornmentContentInfo({
  type: kConnectingLinesType,
  plots: ["scatterPlot"],
  prefix: "ADRN",
  modelClass: ConnectingLinesAdornmentModel,
})

registerAdornmentHandler(kConnectingLinesType, connectingLinesAdornmentHandler)
