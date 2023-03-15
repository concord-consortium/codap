import { urlParams } from "../../utilities/url-params"
import { createDocumentModel } from "../document/create-document-model"
import { IDocumentModel, IDocumentModelSnapshot } from "../document/document"
import { DocumentContentModel } from "../document/document-content"
import { FreeTileRow } from "../document/free-tile-row"
import { MosaicTileRow } from "../document/mosaic-tile-row"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { getSnapshot } from "mobx-state-tree"
const { version } = pkg
const { buildNumber } = build

export function createCodapDocument(snapshot?: IDocumentModelSnapshot): IDocumentModel {
  const document = createDocumentModel({ type: "CODAP", version, build: `${buildNumber}`, ...snapshot })
  if (!document.content) {
    document.setContent(getSnapshot(DocumentContentModel.create()))
  }
  if (document.content?.rowCount === 0) {
    const isFreeLayout = urlParams.layout === "free"
    // CODAP v2/v3 documents have a single "row" containing all tiles/components
    // const rowCreator = () => FreeTileRow.create()
    // But for now we use a mosaic to preserve the current dashboard behavior until
    // we have the ability to create/move components.
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
