import { DocumentContentModel } from "./document-content"
import { FreeTileRow } from "./free-tile-row"

export const CodapDocumentContent = DocumentContentModel
  .named("CodapDocumentContent")
  .props({
    // CODAP-specific properties(?)
  })
  .actions(self => ({
    afterCreate() {
      // CODAP v2/v3 documents have a single "row" containing all tiles/components
      const row = FreeTileRow.create()
      self.insertRow(row)
      self.setVisibleRows([row.id])
    }
  }))
