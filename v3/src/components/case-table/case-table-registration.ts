import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { CaseTableComponent } from "./case-table-component"
import { kCaseTableTileType } from "./case-table-defs"
import { CaseTableModel, ICaseTableSnapshot } from "./case-table-model"
import { CaseTableTitleBar } from "./case-table-title-bar"
import TableIcon from '../../assets/icons/icon-table.svg'
import { typedId } from "../../utilities/js-utils"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2TableComponent } from "../../v2/codap-v2-types"
import { CaseTableInspector } from "./case-table-inspector"
import { CaseTableToolShelfButton } from "./case-table-tool-shelf-button"

export const kCaseTableIdPrefix = "TABL"

registerTileContentInfo({
  type: kCaseTableTileType,
  prefix: kCaseTableIdPrefix,
  modelClass: CaseTableModel,
  defaultContent: () => ({ type: kCaseTableTileType })
})

registerTileComponentInfo({
  type: kCaseTableTileType,
  TitleBar: CaseTableTitleBar,
  Component: CaseTableComponent,
  InspectorPanel: CaseTableInspector,
  tileEltClass: "codap-case-table",
  Icon: TableIcon,
  shelf: {
    ButtonComponent: CaseTableToolShelfButton,
    position: 1,
    labelKey: "DG.ToolButtonData.tableButton.title",
    hintKey: "DG.ToolButtonData.tableButton.toolTip"
  },
  defaultWidth: 580,
  defaultHeight: 275
})

registerV2TileImporter("DG.TableView", ({ v2Component, v2Document, sharedModelManager, insertTile }) => {
  if (!isV2TableComponent(v2Component)) return

  const { title = "", _links_ } = v2Component.componentStorage

  const content: ICaseTableSnapshot = {
    type: kCaseTableTileType
  }

  const tableTileSnap: ITileModelSnapshotIn = { id: typedId(kCaseTableIdPrefix), title, content }
  const tableTile = insertTile(tableTileSnap)

  // add links to shared models
  if (tableTile) {
    const contextId = _links_.context.id
    const { data, metadata } = v2Document.getDataAndMetadata(contextId)
    data && sharedModelManager?.addTileSharedModel(tableTile.content, data, true)
    metadata && sharedModelManager?.addTileSharedModel(tableTile.content, metadata, true)
  }

  return tableTile
})
