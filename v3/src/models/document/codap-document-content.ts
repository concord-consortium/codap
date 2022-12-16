import { DocumentContentModel } from "./document-content"
import { FreeTileRow } from "./free-tile-row"

export const CodapDocumentContent = DocumentContentModel
  .named("CodapDocumentContent")
  .props({
    // CODAP-specific properties
  })
  .actions(self => ({
    afterCreate() {
      // CODAP v2/v3 documents have a single "row" containing all tiles/components
      self.insertRow(FreeTileRow.create())
    }
  }))
