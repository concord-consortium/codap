// register TestTileContent
import "../../test/test-tile-content"
import { convertParsedCsvToDataSet } from "../../utilities/csv-import"
import { createCodapDocument } from "../codap/create-codap-document"
import { gDataBroker } from "../data/data-broker"
import { ISharedModelManager } from "../shared/shared-model-manager"
import { getSharedModelManager } from "../tiles/tile-environment"
import { IDocumentModel } from "./document"
import { IDocumentContentModel } from "./document-content"
import { FreeTileRow } from "./free-tile-row"

describe("DocumentContent", () => {
  let document: IDocumentModel
  let content: IDocumentContentModel
  let sharedModelManager: ISharedModelManager | undefined

  beforeEach(() => {
    document = createCodapDocument({})
    content = document.content!
    sharedModelManager = getSharedModelManager(document)
    gDataBroker.setSharedModelManager(sharedModelManager!)
    const row = FreeTileRow.create()
    content.insertRow(row)
    content.setVisibleRows([row.id])
  })

  it("should import data into a DataSet and into the DataBroker", () => {
    const data = convertParsedCsvToDataSet({ data: [{ a: "a1", b: "b1" }, { a: "a2", b: "b2" }] } as any, "test")
    content.importDataSet(data, { defaultTileType: "Test" })
    expect(gDataBroker.length).toBe(1)
    expect(gDataBroker.first?.name).toBe("test")
    const ds = gDataBroker.getDataSetByName("test")
    expect(ds).toBeDefined()
    expect(ds?.attributes.length).toBe(2)
    expect(ds?.items.length).toBe(2)
  })
})
