import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { DataSummary } from "./data-summary"
import { kDataSummaryTileClass, kDataSummaryTileType } from "./data-summary-defs"
import { DataSummaryModel } from "./data-summary-model"
import { DataSummaryTitleBar } from "./data-summary-title-bar"

registerTileContentInfo({
  type: kDataSummaryTileType,
  prefix: "DSUM",
  modelClass: DataSummaryModel,
  defaultContent: () => DataSummaryModel.create()
})

registerTileComponentInfo({
  type: kDataSummaryTileType,
  TitleBar: DataSummaryTitleBar,
  Component: DataSummary,
  tileEltClass: kDataSummaryTileClass
})
