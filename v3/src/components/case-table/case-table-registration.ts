import { SetRequired } from "type-fest"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModel, ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { CaseTableComponent } from "./case-table-component"
import { kCaseTableTileType } from "./case-table-defs"
import { CaseTableModel, ICaseTableSnapshot } from "./case-table-model"
import { CaseTableCardTitleBar } from "../case-table-card-common/case-table-card-title-bar"
import TableIcon from '../../assets/icons/icon-table.svg'
import { toV3Id } from "../../utilities/codap-utils"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isCodapV2Attribute, isV2TableComponent } from "../../v2/codap-v2-types"
import { CaseTableInspector } from "./case-table-inspector"
import { CaseTableToolShelfButton } from "./case-table-tool-shelf-button"
import { getTileDataSet } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"

export const kCaseTableIdPrefix = "TABL"

registerTileContentInfo({
  type: kCaseTableTileType,
  prefix: kCaseTableIdPrefix,
  modelClass: CaseTableModel,
  defaultContent: () => ({ type: kCaseTableTileType }),
  getTitle: (tile) => {
    const data = tile?.content && getTileDataSet(tile?.content)
    return data?.title || t("DG.DocumentController.caseTableTitle")
  },
  hideOnClose: true
})

registerTileComponentInfo({
  type: kCaseTableTileType,
  TitleBar: CaseTableCardTitleBar,
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
  defaultHeight: 200
})

registerV2TileImporter("DG.TableView", ({ v2Component, v2Document, sharedModelManager, insertTile }) => {
  if (!isV2TableComponent(v2Component)) return

  const { guid, componentStorage: { title = "", _links_, attributeWidths } } = v2Component

  const content: SetRequired<ICaseTableSnapshot, "columnWidths"> = {
    type: kCaseTableTileType,
    columnWidths: {}
  }
  const contextId = _links_.context.id
  const { data, metadata } = v2Document.getDataAndMetadata(contextId)

  // stash the table's column widths in the content
  attributeWidths?.forEach(entry => {
    const v2Attr = v2Document.getV2Attribute(entry._links_.attr.id)
    if (isCodapV2Attribute(v2Attr)) {
      const attrId = data?.dataSet.attrIDFromName(v2Attr.name)
      if (attrId && entry.width) {
        content.columnWidths[attrId] = entry.width
      }
    }
  })

  const tableTileSnap: ITileModelSnapshotIn = { id: toV3Id(kCaseTableIdPrefix, guid), title, content }
  const tableTile = insertTile(tableTileSnap)

  // Make sure metadata knows this is the table tile and it is the last shown
  metadata?.setLastShownTableOrCardTileId(tableTile?.id)
  metadata?.setCaseTableTileId(tableTile?.id)

  // add links to shared models
  if (tableTile) {
    data && sharedModelManager?.addTileSharedModel(tableTile.content, data, true)
    metadata && sharedModelManager?.addTileSharedModel(tableTile.content, metadata, true)
  }

  return tableTile
})
