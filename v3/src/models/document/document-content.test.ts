import { convertParsedCsvToDataSet } from "../../utilities/csv-import"
import { gDataBroker } from "../data/data-broker"
import { DocumentContentModel, IDocumentContentModel } from "./document-content"
// register TestTileContent
import "../../test/test-tile-content"
import { FreeTileRow } from "./free-tile-row"

describe("DocumentContent", () => {
  let content: IDocumentContentModel

  beforeEach(() => {
    gDataBroker.clear()
    content = DocumentContentModel.create({})
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
    expect(ds?.cases.length).toBe(2)
  })
})
