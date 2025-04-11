import { TestTileContent } from "../../test/test-tile-content"
import { createCodapDocument } from "../codap/create-codap-document"
import { IDocumentModel } from "../document/document"
import { TileModel } from "../tiles/tile-model"
import { DataSetMetadata } from "./data-set-metadata"
import { SharedDataSet } from "./shared-data-set"
import { getSharedDataSets } from "./shared-data-utils"

// shared-data-utils is tested pretty well by data-set-linking.test.ts
describe("SharedDataUtils", () => {
  let document: IDocumentModel = createCodapDocument(undefined, { noGlobals: true })
  let tile = TileModel.create({ content: TestTileContent.create() })
  let sharedDataSet = SharedDataSet.create()
  let sharedMetadata = DataSetMetadata.create()

  beforeEach(() => {
    document = createCodapDocument(undefined, { noGlobals: true })
    tile = TileModel.create({ content: TestTileContent.create() })
    document.addTile(tile)
    sharedDataSet = SharedDataSet.create()
    document.content?.addSharedModel(sharedDataSet)
    sharedMetadata = DataSetMetadata.create()
    document.content?.addSharedModel(sharedMetadata)
    sharedMetadata.setData(sharedDataSet.dataSet)
  })

  it("find shared datasets", () => {
    const dataSets = getSharedDataSets(tile)
    expect(dataSets.length).toBe(1)
  })
})
