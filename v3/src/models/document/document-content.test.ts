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

  describe("broadcastMessage", () => {
    const message = { action: "notify", resource: "componentChangeNotice", values: {} } as any

    it("broadcasts to every tile when no targetTileId or excludeTileId is given", () => {
      const tile1 = content.createTile("Test")!
      const tile2 = content.createTile("Test")!
      const spy1 = jest.spyOn(tile1.content, "broadcastMessage")
      const spy2 = jest.spyOn(tile2.content, "broadcastMessage")

      content.broadcastMessage(message, () => {})

      expect(spy1).toHaveBeenCalledTimes(1)
      expect(spy2).toHaveBeenCalledTimes(1)
    })

    it("skips the tile specified by excludeTileId (CODAP-1307)", () => {
      const tile1 = content.createTile("Test")!
      const tile2 = content.createTile("Test")!
      const tile3 = content.createTile("Test")!
      const spy1 = jest.spyOn(tile1.content, "broadcastMessage")
      const spy2 = jest.spyOn(tile2.content, "broadcastMessage")
      const spy3 = jest.spyOn(tile3.content, "broadcastMessage")

      content.broadcastMessage(message, () => {}, undefined, tile2.id)

      expect(spy1).toHaveBeenCalledTimes(1)
      expect(spy2).not.toHaveBeenCalled()
      expect(spy3).toHaveBeenCalledTimes(1)
    })

    it("excludeTileId can suppress delivery to a tile that would otherwise be the broadcast target", () => {
      const tile1 = content.createTile("Test")!
      const tile2 = content.createTile("Test")!
      const spy1 = jest.spyOn(tile1.content, "broadcastMessage")
      const spy2 = jest.spyOn(tile2.content, "broadcastMessage")

      // targetTileId limits delivery to tile2; excludeTileId then skips tile2 — nothing receives.
      content.broadcastMessage(message, () => {}, tile2.id, tile2.id)

      expect(spy1).not.toHaveBeenCalled()
      expect(spy2).not.toHaveBeenCalled()
    })
  })
})
