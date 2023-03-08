import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { CaseTableComponent } from "./case-table-component"
import { kCaseTableTileType } from "./case-table-defs"
import { CaseTableModel } from "./case-table-model"
import { CaseTableTitleBar } from "./case-table-title-bar"
import TableIcon from '../../assets/icons/icon-table.svg'

registerTileContentInfo({
  type: kCaseTableTileType,
  modelClass: CaseTableModel,
  defaultContent: () => CaseTableModel.create()
})

registerTileComponentInfo({
  type: "CodapCaseTable",
  TitleBar: CaseTableTitleBar,
  Component: CaseTableComponent,
  tileEltClass: "codap-case-table",
  Icon: TableIcon,
  height: 275,
  width: 580,
  toolshelfPosition: 10
})
