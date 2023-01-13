import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { CaseTableComponent } from "./case-table-component"
import { kCaseTableTileType } from "./case-table-defs"
import { CaseTableModel } from "./case-table-model"

registerTileContentInfo({
  type: kCaseTableTileType,
  modelClass: CaseTableModel,
  defaultContent: () => CaseTableModel.create()
})

registerTileComponentInfo({
  type: "CodapCaseTable",
  Component: CaseTableComponent,
  tileEltClass: "codap-case-table"
})
