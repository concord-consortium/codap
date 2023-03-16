import { getEnv, getSnapshot } from "mobx-state-tree"
import { urlParams } from "../../utilities/url-params"
import { createDocumentModel } from "../document/create-document-model"
import { IDocumentModel, IDocumentModelSnapshot } from "../document/document"
import { DocumentContentModel } from "../document/document-content"
import { FreeTileRow } from "../document/free-tile-row"
import { MosaicTileRow } from "../document/mosaic-tile-row"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { ITileEnvironment } from "../tiles/tile-content"
const { version } = pkg
const { buildNumber } = build

export function createCodapDocument(snapshot?: IDocumentModelSnapshot, layout?: "free" | "mosaic"): IDocumentModel {
  const document = createDocumentModel({ type: "CODAP", version, build: `${buildNumber}`, ...snapshot })
  if (!document.content) {
    document.setContent(getSnapshot(DocumentContentModel.create()))
  }
  if (document.content?.rowCount === 0) {
    const isFreeLayout = layout === "free" || urlParams.layout === "free"
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

export function getTileEnvironment(document: IDocumentModel) {
  const env: ITileEnvironment | undefined = getEnv(document)
  return env
}
