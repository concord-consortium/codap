import { getSnapshot } from "mobx-state-tree"
import { urlParams } from "../../utilities/url-params"
import { createDocumentModel } from "../document/create-document-model"
import { IDocumentModel, IDocumentModelSnapshot } from "../document/document"
import { DocumentContentModel } from "../document/document-content"
import { FreeTileRow } from "../document/free-tile-row"
import { MosaicTileRow } from "../document/mosaic-tile-row"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { GlobalValueManager } from "../global/global-value-manager"
import "../global/global-value-manager-registration"
const { version } = pkg
const { buildNumber } = build

export function createCodapDocument(snapshot?: IDocumentModelSnapshot, layout?: "free" | "mosaic"): IDocumentModel {
  const document = createDocumentModel({ type: "CODAP", version, build: `${buildNumber}`, ...snapshot })
  // create the content if there isn't any
  if (!document.content) {
    document.setContent(getSnapshot(DocumentContentModel.create()))
  }
  // add the global value manager if there isn't one
  if (!document.content?.getFirstSharedModelByType(GlobalValueManager)) {
    document.content?.addSharedModel(GlobalValueManager.create())
  }
  if (document.content?.rowCount === 0) {
    const isFreeLayout = layout === "free" || urlParams.layout === "free"
    // CODAP v2/v3 documents have a single "row" containing all tiles/components
    const rowCreator = isFreeLayout
                        ? () => FreeTileRow.create()
                        : () => MosaicTileRow.create()
    const row = rowCreator()
    document.content.setRowCreator(rowCreator)
    document.content.insertRow(row)
    document.content.setVisibleRows([row.id])
  }
  return document
}
