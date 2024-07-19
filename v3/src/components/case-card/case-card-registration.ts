import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { CaseCardComponent } from "./case-card-component"
import { kCaseCardTileType } from "./case-card-defs"
import { CaseCardModel } from "./case-card-model"
import { CaseTableCardTitleBar } from "../case-table-card-common/case-table-card-title-bar"
import CardIcon from '../../assets/icons/icon-case-card.svg'
import { t } from "../../utilities/translation/translate"
import { getTileDataSet } from "../../models/shared/shared-data-utils"
/*
import { CaseCardInspector } from "./case-card-inspector"
*/

export const kCaseCardIdPrefix = "CARD"

registerTileContentInfo({
  type: kCaseCardTileType,
  prefix: kCaseCardIdPrefix,
  modelClass: CaseCardModel,
  defaultContent: () => ({ type: kCaseCardTileType }),
  getTitle: (tile) => {
    const data = tile?.content && getTileDataSet(tile?.content)
    return data?.title || t("DG.DocumentController.caseTableTitle")
  },
  hideOnClose: true
})

registerTileComponentInfo({
  type: kCaseCardTileType,
  TitleBar: CaseTableCardTitleBar,
  Component: CaseCardComponent,
  // InspectorPanel: CaseCardInspector,
  tileEltClass: "codap-case-card",
  Icon: CardIcon,
  defaultWidth: 200,
  defaultHeight: 400
})

/*
registerV2TileImporter("DG.CardView", ({ v2Component, v2Document, sharedModelManager, insertTile }) => {
  if (!isV2CardComponent(v2Component)) return

  const { title = "", _links_, attributeWidths } = v2Component.componentStorage

  const content: SetRequired<ICaseCardSnapshot, "columnWidths"> = {
    type: kCaseCardTileType,
    columnWidths: {}
  }
  const contextId = _links_.context.id
  const { data, metadata } = v2Document.getDataAndMetadata(contextId)

  // stash the card's column widths in the content
  attributeWidths?.forEach(entry => {
    const v2Attr = v2Document.getV2Attribute(entry._links_.attr.id)
    if (isCodapV2Attribute(v2Attr)) {
      const attrId = data?.dataSet.attrIDFromName(v2Attr.name)
      if (attrId && entry.width) {
        content.columnWidths[attrId] = entry.width
      }
    }
  })

  const cardTileSnap: ITileModelSnapshotIn = { id: typedId(kCaseCardIdPrefix), title, content }
  const cardTile = insertTile(cardTileSnap)

  // Make sure metadata knows this is the table tile and it is the last shown
  metadata?.setLastShownTableOrCardTileId(cardTile?.id)
  metadata?.setCaseCardTileId(cardTile?.id)

  // add links to shared models
  if (cardTile) {
    data && sharedModelManager?.addTileSharedModel(cardTile.content, data, true)
    metadata && sharedModelManager?.addTileSharedModel(cardTile.content, metadata, true)
  }

  return cardTile
})
*/
