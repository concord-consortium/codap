import { createCodapDocument } from "../codap/create-codap-document"
import { IDocumentModel } from "../document/document"
import { TileContentModel } from "../tiles/tile-content"
import { registerTileContentInfo } from "../tiles/tile-content-info"
import { getSharedModelManager } from "../tiles/tile-environment"
import { TileModel } from "../tiles/tile-model"
import { SharedCaseMetadata } from "./shared-case-metadata"
import { SharedDataSet } from "./shared-data-set"
import {
  getDataSetFromId, getTileCaseMetadata, getTileDataSet, getTileSharedModels, isTileLinkedToDataSet,
  linkTileToDataSet, unlinkTileFromDataSets
} from "./shared-data-utils"
import "./shared-data-set-registration"
import "./shared-case-metadata-registration"

const TestTileContent = TileContentModel
  .named("TestTile")
  .props({
    type: "Test"
  })
  .actions(self => ({
    updateAfterSharedModelChanges() {
      // NOP
    }
  }))

registerTileContentInfo({
  type: "Test",
  prefix: "TEST",
  modelClass: TestTileContent,
  defaultContent(options) {
    return TestTileContent.create()
  }
})

describe("SharedDataUtils", () => {
  let document: IDocumentModel = createCodapDocument(undefined, { noGlobals: true })
  let tile = TileModel.create({ content: TestTileContent.create() })
  let sharedDataSet = SharedDataSet.create()
  let sharedMetadata = SharedCaseMetadata.create()

  beforeEach(() => {
    document = createCodapDocument(undefined, { noGlobals: true })
    tile = TileModel.create({ content: TestTileContent.create() })
    document.addTile(tile)
    sharedDataSet = SharedDataSet.create()
    document.content?.addSharedModel(sharedDataSet)
    sharedMetadata = SharedCaseMetadata.create()
    document.content?.addSharedModel(sharedMetadata)
    sharedMetadata.setData(sharedDataSet.dataSet)
  })

  it("handles tiles not connected to the document", () => {
    const orphan = TileModel.create({ content: TestTileContent.create() })
    expect(getTileSharedModels(orphan.content)).toEqual([])
    expect(getDataSetFromId(orphan.content, sharedDataSet.dataSet.id)).toBeUndefined()
    linkTileToDataSet(orphan, sharedDataSet.dataSet)
    expect(isTileLinkedToDataSet(orphan.content, sharedDataSet.dataSet)).toBe(false)
    expect(getTileSharedModels(orphan.content)).toEqual([])
    unlinkTileFromDataSets(orphan.content)
    expect(isTileLinkedToDataSet(orphan.content, sharedDataSet.dataSet)).toBe(false)
    expect(getTileSharedModels(orphan.content)).toEqual([])
  })

  it("works as expected when no tiles are linked", () => {
    expect(getSharedModelManager(document)).toBeDefined()
    expect(getSharedModelManager(tile)).toBeDefined()
    expect(sharedMetadata.data).toBeDefined()
    expect(document.content?.sharedModelMap.size).toBe(2)
    expect(getDataSetFromId(document, "foo")).toBeUndefined()
    expect(getDataSetFromId(document, sharedDataSet.dataSet.id)).toBe(sharedDataSet.dataSet)
    expect(isTileLinkedToDataSet(tile.content, sharedDataSet.dataSet)).toBe(false)
    expect(getTileSharedModels(tile.content)).toEqual([])
    expect(getTileDataSet(tile.content)).toBeUndefined()
    expect(getTileCaseMetadata(tile.content)).toBeUndefined()
  })

  it("can link/unlink tiles to/from data sets and shared case metadata", () => {
    linkTileToDataSet(tile, sharedDataSet.dataSet)
    expect(document.content?.sharedModelMap.size).toBe(2)
    expect(getTileSharedModels(tile.content).length).toEqual(2)
    expect(isTileLinkedToDataSet(tile.content, sharedDataSet.dataSet)).toBe(true)
    expect(getTileDataSet(tile.content)).toBe(sharedDataSet.dataSet)
    expect(getTileCaseMetadata(tile.content)).toBe(sharedMetadata)

    unlinkTileFromDataSets(tile.content)
    expect(document.content?.sharedModelMap.size).toBe(2)
    expect(getTileSharedModels(tile.content).length).toEqual(0)
    expect(isTileLinkedToDataSet(tile.content, sharedDataSet.dataSet)).toBe(false)
    expect(getTileDataSet(tile.content)).not.toBeDefined()
    expect(getTileCaseMetadata(tile.content)).not.toBeDefined()
  })

  it("auto-unlinks previously linked data sets when linking a new data set", () => {
    const sharedDataSet2 = SharedDataSet.create()
    document.content?.addSharedModel(sharedDataSet2)
    const sharedMetadata2 = SharedCaseMetadata.create()
    document.content?.addSharedModel(sharedMetadata2)
    sharedMetadata2.setData(sharedDataSet2.dataSet)
    expect(document.content?.sharedModelMap.size).toBe(4)

    linkTileToDataSet(tile, sharedDataSet.dataSet)
    expect(isTileLinkedToDataSet(tile.content, sharedDataSet.dataSet)).toBe(true)
    expect(isTileLinkedToDataSet(tile.content, sharedDataSet2.dataSet)).toBe(false)
    expect(getTileDataSet(tile.content)).toBe(sharedDataSet.dataSet)
    expect(getTileCaseMetadata(tile.content)).toBe(sharedMetadata)

    linkTileToDataSet(tile, sharedDataSet2.dataSet)
    expect(getTileSharedModels(tile.content).length).toEqual(2)
    expect(isTileLinkedToDataSet(tile.content, sharedDataSet.dataSet)).toBe(false)
    expect(isTileLinkedToDataSet(tile.content, sharedDataSet2.dataSet)).toBe(true)
    expect(getTileDataSet(tile.content)).toBe(sharedDataSet2.dataSet)
    expect(getTileCaseMetadata(tile.content)).toBe(sharedMetadata2)
  })
})
