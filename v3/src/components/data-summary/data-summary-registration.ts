import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ComponentTitleBar } from "../component-title-bar"
import { DataSummary } from "./data-summary"
import { kDataSummaryTileClass, kDataSummaryTileType } from "./data-summary-defs"
import { DataSummaryModel } from "./data-summary-model"

registerTileContentInfo({
  type: kDataSummaryTileType,
  prefix: "DSUM",
  modelClass: DataSummaryModel,
  defaultContent: () => DataSummaryModel.create()
})

registerTileComponentInfo({
  type: kDataSummaryTileType,
  TitleBar: ComponentTitleBar,
  Component: DataSummary,
  tileEltClass: kDataSummaryTileClass,
})
