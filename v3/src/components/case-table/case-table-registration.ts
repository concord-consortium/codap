import { SetOptional, SetRequired } from "type-fest"
import TableIcon from "../../assets/icons/icon-table.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileDataSet } from "../../models/shared/shared-data-utils"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV2Id, toV3AttrId, toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import {
  guidLink, ICodapV2BaseComponentStorage, ICodapV2TableStorage, isV2TableComponent
} from "../../v2/codap-v2-types"
import { caseTableCardComponentHandler } from "../case-tile-common/case-tile-component-handler"
import { CaseTileTitleBar } from "../case-tile-common/case-tile-title-bar"
import { CaseTableComponent } from "./case-table-component"
import { kCaseTableTileType, kV2CaseTableType } from "./case-table-defs"
import { CaseTableInspector } from "./case-table-inspector"
import { CaseTableModel, ICaseTableSnapshot, isCaseTableModel } from "./case-table-model"
import { CaseTableToolShelfButton } from "./case-table-tool-shelf-button"
import { kCaseTableDefaultWidth } from "./case-table-types"

export const kCaseTableIdPrefix = "TABL"

registerTileContentInfo({
  type: kCaseTableTileType,
  prefix: kCaseTableIdPrefix,
  modelClass: CaseTableModel,
  defaultContent: () => ({ type: kCaseTableTileType }),
  getTitle: (tile) => {
    const data = tile.content && getTileDataSet(tile.content)
    return data?.title ?? tile.title ?? t("DG.DocumentController.caseTableTitle")
  },
  hideOnClose: true
})

registerTileComponentInfo({
  type: kCaseTableTileType,
  TitleBar: CaseTileTitleBar,
  Component: CaseTableComponent,
  InspectorPanel: CaseTableInspector,
  tileEltClass: "codap-case-table",
  Icon: TableIcon,
  shelf: {
    ButtonComponent: CaseTableToolShelfButton,
    position: 1,
    labelKey: "DG.ToolButtonData.tableButton.title",
    hintKey: "DG.ToolButtonData.tableButton.toolTip",
    undoStringKey: "V3.Undo.caseTable.create",
    redoStringKey: "V3.Redo.caseTable.create"
  },
  defaultWidth: kCaseTableDefaultWidth,
  defaultHeight: 200
})

registerV2TileExporter(kCaseTableTileType, ({ tile }) => {
  const tableContent = isCaseTableModel(tile.content) ? tile.content : undefined
  let componentStorage: Maybe<SetOptional<ICodapV2TableStorage, keyof ICodapV2BaseComponentStorage>>
  const dataSet = tableContent?.data
  const attributeWidths = Array.from(tableContent?.columnWidths.entries() ?? []).map(([attrId, width]) => {
    return { _links_: { attr: guidLink("DG.Attribute", toV2Id(attrId)) }, width }
  })
  if (dataSet) {
    componentStorage = {
      _links_: { context: guidLink("DG.DataContextRecord", toV2Id(dataSet.id)) },
      attributeWidths,
      title: tile._title
    }
  }
  return { type: "DG.TableView", componentStorage }
})

registerV2TileImporter("DG.TableView", ({ v2Component, v2Document, sharedModelManager, insertTile }) => {
  if (!isV2TableComponent(v2Component)) return

  const { guid, componentStorage: { name, title = "", _links_, isActive, attributeWidths } } = v2Component

  // Handle broken tables that don't have any links
  if (!_links_) return

  const content: SetRequired<ICaseTableSnapshot, "columnWidths"> = {
    type: kCaseTableTileType,
    columnWidths: {}
  }
  const contextId = _links_.context.id
  const { data, metadata } = v2Document.getDataAndMetadata(contextId)

  // stash the table's column widths in the content
  attributeWidths?.forEach(entry => {
    const v2Attr = v2Document.getV2Attribute(entry._links_.attr.id)
    if (v2Attr) {
      const v3AttrId = toV3AttrId(v2Attr.guid)
      if (v3AttrId && entry.width) {
        content.columnWidths[v3AttrId] = entry.width
      }
    }
  })

  const tableTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kCaseTableIdPrefix, guid), name, _title: title, content
  }
  const tableTile = insertTile(tableTileSnap)

  // Make sure metadata knows this is the table tile and it is the last shown
  if (isActive) {
    metadata?.setLastShownTableOrCardTileId(tableTile?.id)
  }
  metadata?.setCaseTableTileId(tableTile?.id)

  // add links to shared models
  if (tableTile) {
    data && sharedModelManager?.addTileSharedModel(tableTile.content, data, true)
    metadata && sharedModelManager?.addTileSharedModel(tableTile.content, metadata, true)
  }

  return tableTile
})

registerComponentHandler(kV2CaseTableType, caseTableCardComponentHandler)
