import { createDocumentModel } from "./create-document-model"
import { IDocumentModelSnapshot } from "./document"
import { FreeTileRow } from "./free-tile-row"

export function createCodapDocument(snapshot?: IDocumentModelSnapshot) {
  const document = createDocumentModel(snapshot)
  if (document.content?.rowCount === 0) {
    // CODAP v2/v3 documents have a single "row" containing all tiles/components
    const rowCreator = () => FreeTileRow.create()
    const row = rowCreator()
    document.content.setRowCreator(rowCreator)
    document.content.insertRow(row)
    document.content.setVisibleRows([row.id])
  }
}
