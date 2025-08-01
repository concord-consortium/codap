import { SetOptional, SetRequired } from "type-fest"
import TableIcon from "../../assets/icons/icon-table.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { getTileDataSet } from "../../models/shared/shared-data-tile-utils"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV2Id, toV3AttrId, toV3CaseId, toV3CollectionId, toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileExporter, V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import {
  guidLink, ICodapV2BaseComponentStorage, ICodapV2TableStorage, IGuidLink, isV2TableComponent
} from "../../v2/codap-v2-types"
import { caseTableCardComponentHandler } from "../case-tile-common/case-tile-component-handler"
import { CaseTileTitleBar } from "../case-tile-common/case-tile-title-bar"
import { CaseTableComponent } from "./case-table-component"
import { kCaseTableTileType, kV2CaseTableType } from "./case-table-defs"
import { CaseTableInspector } from "./case-table-inspector"
import { CaseTableModel, ICaseTableSnapshot, isCaseTableModel } from "./case-table-model"
import { CaseTableToolShelfButton } from "./case-table-tool-shelf-button"
import { kCaseTableDefaultHeight, kCaseTableDefaultWidth } from "./case-table-types"

export const kCaseTableIdPrefix = "TABL"

registerTileContentInfo({
  type: kCaseTableTileType,
  prefix: kCaseTableIdPrefix,
  modelClass: CaseTableModel,
  defaultContent: () => ({ type: kCaseTableTileType }),
  getTitle: (tile) => {
    const data = tile.content && getTileDataSet(tile.content)
    return data?.displayTitle ?? tile.title ?? t("DG.DocumentController.caseTableTitle")
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
  defaultHeight: kCaseTableDefaultHeight
})

const v2TableExporter: V2TileExportFn = ({ tile }) => {
  const tableContent = isCaseTableModel(tile.content) ? tile.content : undefined
  let componentStorage: Maybe<SetOptional<ICodapV2TableStorage, keyof ICodapV2BaseComponentStorage>>
  const {
    columnWidths, rowHeights, horizontalScrollOffset, isIndexHidden, data: dataSet, metadata
  } = tableContent || {}
  const attributeWidths = Array.from(columnWidths?.entries() ?? []).map(([attrId, width]) => {
    return { _links_: { attr: guidLink("DG.Attribute", toV2Id(attrId)) }, width }
  })
  const _rowHeights = Array.from(rowHeights?.entries() ?? []).map(([collectionId, rowHeight]) => {
    return { _links_: { collection: guidLink("DG.Collection", toV2Id(collectionId)) }, rowHeight }
  })
  const collapsedNodes: IGuidLink<"DG.Case">[] = []
  if (metadata) {
    metadata.collections.forEach(collection => {
      Array.from(collection.collapsed.keys())
        .forEach(caseId => collapsedNodes.push(guidLink("DG.Case", toV2Id(caseId))))
    })
  }
  if (dataSet) {
    componentStorage = {
      _links_: {
        context: guidLink("DG.DataContextRecord", toV2Id(dataSet.id)),
        ...(collapsedNodes.length ? { collapsedNodes } : {})
      },
      attributeWidths,
      ...(_rowHeights.length ? { rowHeights: _rowHeights } : {}),
      horizontalScrollOffset,
      isActive: metadata?.lastShownTableOrCardTileId === tile.id,
      isIndexHidden,
      title: tile._title
    }
  }
  return { type: "DG.TableView", componentStorage }
}
// don't write out an empty `name` property
v2TableExporter.options = ({ tile }) => ({ suppressName: !tile.name })
registerV2TileExporter(kCaseTableTileType, v2TableExporter)

registerV2TileImporter("DG.TableView", ({ v2Component, v2Document, getCaseData, insertTile, linkSharedModel }) => {
  if (!isV2TableComponent(v2Component)) return

  const {
    guid,
    componentStorage: {
      name, title, userSetTitle, _links_, isActive, attributeWidths, cannotClose, rowHeights,
      horizontalScrollOffset, isIndexHidden
    }
  } = v2Component

  // Handle broken tables that don't have any links
  if (!_links_) return

  const content: SetRequired<ICaseTableSnapshot, "columnWidths" | "rowHeights"> = {
    type: kCaseTableTileType,
    columnWidths: {},
    rowHeights: {},
    horizontalScrollOffset,
    isIndexHidden
  }
  const { collapsedNodes = [], context } = _links_
  const { sharedData, sharedMetadata } = getCaseData(context.id)
  const collapsedCases = Array.isArray(collapsedNodes) ? collapsedNodes : [collapsedNodes]

  collapsedCases.forEach(({ id }) => {
    const caseId = toV3CaseId(id)
    if (caseId) {
      sharedMetadata?.setIsCollapsed(caseId, true)
    }
  })

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

  // stash the table's row heights in the content
  rowHeights?.forEach(({ _links_: { collection: { id } }, rowHeight}) => {
    content.rowHeights[toV3CollectionId(id)] = rowHeight
  })

  const tableTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kCaseTableIdPrefix, guid), name, _title: title, userSetTitle, content, cannotClose
  }
  const tableTile = insertTile(tableTileSnap)

  // Make sure metadata knows this is the table tile and it is the last shown
  if (isActive) {
    sharedMetadata?.setLastShownTableOrCardTileId(tableTile?.id)
  }
  sharedMetadata?.setCaseTableTileId(tableTile?.id)

  // add links to shared models
  if (tableTile) {
    linkSharedModel(tableTile.content, sharedData, true)
    linkSharedModel(tableTile.content, sharedMetadata, true)
  }

  return tableTile
})

registerComponentHandler(kV2CaseTableType, caseTableCardComponentHandler)
