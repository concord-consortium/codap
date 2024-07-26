import { getSnapshot } from "mobx-state-tree"
import { SetOptional } from "type-fest"
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
import { getFormulaManager } from "../tiles/tile-environment"
const { version } = pkg
const { buildNumber } = build

type ICodapDocumentModelSnapshot = SetOptional<IDocumentModelSnapshot, "type">

export function isCodapDocument(doc: unknown) {
  if (!doc || typeof doc !== "object") return false
  if (!("content" in doc) || !doc.content || typeof doc.content !== "object") return false
  return "rowMap" in doc.content && !!doc.content.rowMap &&
        "tileMap" in doc.content && !!doc.content.tileMap
}

interface IOptions {
  layout?: "free" | "mosaic"
  noGlobals?: boolean
}
export function createCodapDocument(snapshot?: ICodapDocumentModelSnapshot, options?: IOptions): IDocumentModel {
  const { layout = "free", noGlobals = false } = options || {}
  const document = createDocumentModel({ type: "CODAP", version, build: `${buildNumber}`, ...snapshot })
  // create the content if there isn't any
  if (!document.content) {
    document.setContent(getSnapshot(DocumentContentModel.create()))
  }
  // add the global value manager if there isn't one
  if (document.content && !noGlobals && !document.content.getFirstSharedModelByType(GlobalValueManager)) {
    const globalValueManager = GlobalValueManager.create()
    document.content.addSharedModel(globalValueManager)
    // Add the global value manager to the formula manager
    getFormulaManager(document)?.addGlobalValueManager(globalValueManager)
  }
  // create the default tile container ("row")
  if (document.content?.rowCount === 0) {
    const isMosaicLayout = layout === "mosaic" || urlParams.layout === "mosaic"
    const rowCreator = isMosaicLayout
                        ? () => MosaicTileRow.create()
                        : () => FreeTileRow.create()
    const row = rowCreator()
    document.content.setRowCreator(rowCreator)
    document.content.insertRow(row)
    document.content.setVisibleRows([row.id])
  }
  return document
}
