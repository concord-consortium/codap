import { SetOptional, SetRequired } from "type-fest"
import CardIcon from "../../assets/icons/icon-case-card.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { IFreeTileInRowOptions } from "../../models/document/free-tile-row"
import { getTileDataSet } from "../../models/shared/shared-data-tile-utils"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV2Id, toV3CollectionId, toV3Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"
import { LayoutTransformFn, registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import {
  guidLink, ICodapV2BaseComponentStorage, ICodapV2CaseCardStorage, isV2CaseCardComponent
} from "../../v2/codap-v2-types"
import { caseTableCardComponentHandler } from "../case-tile-common/case-tile-component-handler"
import { CaseTileTitleBar } from "../case-tile-common/case-tile-title-bar"
import { CaseTileInspector } from "../case-tile-common/inspector-panel/case-tile-inspector"
import { CaseCardComponent } from "./case-card-component"
import { kCaseCardTileType, kV2CaseCardType } from "./case-card-defs"
import { CaseCardModel, ICaseCardSnapshot, isCaseCardModel } from "./case-card-model"

export const kCaseCardIdPrefix = "CARD"
export const kCaseCardDefaultHeight = 400
export const kCaseCardDefaultWidth = 350

registerTileContentInfo({
  type: kCaseCardTileType,
  prefix: kCaseCardIdPrefix,
  modelClass: CaseCardModel,
  defaultContent: () => ({ type: kCaseCardTileType }),
  getTitle: (tile) => {
    const data = tile.content && getTileDataSet(tile.content)
    return data?.displayTitle || t("DG.DocumentController.caseTableTitle")
  },
  hideOnClose: () => true
})

registerTileComponentInfo({
  type: kCaseCardTileType,
  TitleBar: CaseTileTitleBar,
  Component: CaseCardComponent,
  InspectorPanel: CaseTileInspector,
  tileEltClass: "codap-case-card",
  Icon: CardIcon,
  defaultWidth: kCaseCardDefaultWidth,
  defaultHeight: kCaseCardDefaultHeight
})

registerComponentHandler(kV2CaseCardType, caseTableCardComponentHandler)

registerV2TileExporter(kCaseCardTileType, ({ tile }) => {
  const cardContent = isCaseCardModel(tile.content) ? tile.content : undefined
  let componentStorage: Maybe<SetOptional<ICodapV2CaseCardStorage, keyof ICodapV2BaseComponentStorage>>
  const { data: dataSet, metadata } = cardContent || {}
  const columnWidthMap: Record<string, number> = {}
  cardContent?.attributeColumnWidths.forEach((widthPct, collectionId) => {
    columnWidthMap[String(toV2Id(String(collectionId)))] = widthPct
  })
  if (dataSet) {
    componentStorage = {
      _links_: { context: guidLink("DG.DataContextRecord", toV2Id(dataSet.id)) },
      columnWidthMap,
      isActive: metadata?.lastShownTableOrCardTileId === tile.id,
      title: tile._title
    }
  }
  return { type: "DG.CaseCard", componentStorage }
})

registerV2TileImporter("DG.CaseCard", ({ v2Component, v2Document, getCaseData, insertTile, linkSharedModel }) => {
  if (!isV2CaseCardComponent(v2Component)) return

  const {
    guid,
    componentStorage: { name, title, userSetTitle, _links_, isActive, columnWidthPct, columnWidthMap, cannotClose }
  } = v2Component

  const content: SetRequired<ICaseCardSnapshot, "attributeColumnWidths"> = {
    type: kCaseCardTileType,
    attributeColumnWidths: {}
  }
  const contextId = _links_.context.id
  const { sharedData, sharedMetadata } = getCaseData(contextId)

  // some documents (presumably preceding hierarchy support) have a single percentage width
  if (columnWidthPct != null) {
    const collection = v2Document.getV2CollectionByIndex()
    if (collection) {
      content.attributeColumnWidths[toV3CollectionId(collection.guid)] = Number(columnWidthPct)
    }
  }
  // most documents have a map of collection id to percentage width
  else if (columnWidthMap) {
    Object.keys(columnWidthMap).forEach(collectionId => {
      const columnWidth = columnWidthMap[collectionId]
      if (columnWidth) {
        content.attributeColumnWidths[toV3CollectionId(collectionId)] = columnWidth
      }
    })
  }

  const cardTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kCaseCardIdPrefix, guid), name, _title: title, userSetTitle, content, cannotClose
  }
  const transform: LayoutTransformFn = (options: IFreeTileInRowOptions) => {
    const { width, ...others } = options
    // v3 case card is wider than v2
    return width != null && width < kCaseCardDefaultWidth ? { width: kCaseCardDefaultWidth, ...others } : options
  }
  const cardTile = insertTile(cardTileSnap, transform)

  // Make sure metadata knows this is the case card tile and it is the last shown
  if (isActive) {
    sharedMetadata?.setLastShownTableOrCardTileId(cardTile?.id)
  }
  sharedMetadata?.setCaseCardTileId(cardTile?.id)

  // add links to shared models
  if (cardTile) {
    linkSharedModel(cardTile.content, sharedData)
    linkSharedModel(cardTile.content, sharedMetadata)
  }

  return cardTile
})
