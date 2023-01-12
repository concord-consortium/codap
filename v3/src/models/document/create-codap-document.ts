import { CaseTableModel } from "../../components/case-table/case-table-model"
import { DataSummaryModel } from "../../components/data-summary/data-summary-model"
import { GraphModel } from "../../components/graph/models/graph-model"
import { HelloCodapModel } from "../../components/hello/hello-model"
import { SliderModel } from "../../components/slider/slider-model"
import { TileModel } from "../tiles/tile-model"
import { createDocumentModel } from "./create-document-model"
import { IDocumentModel, IDocumentModelSnapshot } from "./document"
import { DocumentContentModel } from "./document-content"
// import { FreeTileRow } from "./free-tile-row"
import { MosaicTileRow } from "./mosaic-tile-row"

export function createCodapDocument(snapshot?: IDocumentModelSnapshot): IDocumentModel {
  const document = createDocumentModel({ type: "CODAP", ...snapshot })
  if (!document.content) {
    document.setContent(DocumentContentModel.create() as any)
  }
  if (document.content?.rowCount === 0) {
    // CODAP v2/v3 documents have a single "row" containing all tiles/components
    // const rowCreator = () => FreeTileRow.create()
    // But for now we use a mosaic to preserve the current dashboard behavior until
    // we have the ability to create/move components.
    const rowCreator = () => MosaicTileRow.create()
    const row = rowCreator()
    document.content.setRowCreator(rowCreator)
    document.content.insertRow(row)
    document.content.setVisibleRows([row.id])
  }
  return document
}

// start with an empty document
let gCurrentDocument = createCodapDocument()

export function getCurrentDocument() {
  return gCurrentDocument
}

export function setCurrentDocument(snapshot?: IDocumentModelSnapshot) {
  gCurrentDocument = createCodapDocument(snapshot)
}

// TODO: Eliminate (or hide behind a URL parameter) default dashboard content
export function addDefaultComponents() {
  const content = gCurrentDocument.content
  if (!content) return

  const row = content.getRowByIndex(0)
  if (!row) return

  setTimeout(() => {
    const summaryTile = TileModel.create({ content: DataSummaryModel.create() })
    content.insertTileInRow(summaryTile, row)
    const tableTile = TileModel.create({ content: CaseTableModel.create() })
    content.insertTileInRow(tableTile, row, { splitTileId: summaryTile.id, direction: "column" })
    const helloTile = TileModel.create({ content: HelloCodapModel.create() })
    content.insertTileInRow(helloTile, row, { splitTileId: summaryTile.id, direction: "row" })
    const sliderTile = TileModel.create({ content: SliderModel.create() })
    content.insertTileInRow(sliderTile, row, { splitTileId: helloTile.id, direction: "column" })
    const graphTile = TileModel.create({ content: GraphModel.create() })
    content.insertTileInRow(graphTile, row, { splitTileId: tableTile.id, direction: "row" })
  })
}
