import { DocumentContentModel, IDocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { isMapContentModel } from "./models/map-content-model"
import { v2MapImporter } from "./v2-map-importer"
import "./map-registration"

const fs = require("fs")
const path = require("path")

function firstMapComponent(v2Document: CodapV2Document) {
  return v2Document.components.find(c => c.type === "DG.MapView")!
}

describe("V2MapImporter imports legacy v2 map documents", () => {
  // legacy v2 map document (0252)
  const sealAndSharkFile = path.join(__dirname, "../../test/v2", "seal-and-shark-demo.codap")
  const sealAndSharkJson = fs.readFileSync(sealAndSharkFile, "utf8")
  const sealAndSharkDoc = safeJsonParse<ICodapV2DocumentJson>(sealAndSharkJson)!

  let v2Document: CodapV2Document
  let docContent: Maybe<IDocumentContentModel>
  let sharedModelManager: Maybe<SharedModelDocumentManager>
  const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
    const tile = docContent!.insertTileSnapshotInDefaultRow(tileSnap)
    return tile
  })

  beforeEach(() => {
    v2Document = new CodapV2Document(sealAndSharkDoc)
    sharedModelManager = new SharedModelDocumentManager()
    docContent = DocumentContentModel.create({}, { sharedModelManager })
    docContent.setRowCreator(() => FreeTileRow.create())
    sharedModelManager.setDocument(docContent)

    // load shared models into sharedModelManager
    v2Document.contexts.forEach(({ guid }) => {
      const { data, metadata } = v2Document.getDataAndMetadata(guid)
      data && sharedModelManager!.addSharedModel(data)
      metadata?.setData(data?.dataSet)
      metadata && sharedModelManager!.addSharedModel(metadata)
    })

    mockInsertTile.mockClear()
  })

  it("imports legacy v2 map components", () => {
    const tile = v2MapImporter({
      v2Component: firstMapComponent(v2Document),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
    expect(mapModel).toBeDefined()
    // layers aren't actually imported from legacy documents
    expect(mapModel?.layers.length).toBe(0)
  })
})

describe("V2MapImporter imports current v2 map documents", () => {
  // current v2 map document (0730)
  const rollerCoastersFile = path.join(__dirname, "../../test/v2", "roller-coasters-map.codap")
  const rollerCoastersJson = fs.readFileSync(rollerCoastersFile, "utf8")
  const rollerCoastersDoc = safeJsonParse<ICodapV2DocumentJson>(rollerCoastersJson)!

  let v2Document: CodapV2Document
  let docContent: Maybe<IDocumentContentModel>
  let sharedModelManager: Maybe<SharedModelDocumentManager>
  const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
    const tile = docContent!.insertTileSnapshotInDefaultRow(tileSnap)
    return tile
  })

  beforeEach(() => {
    v2Document = new CodapV2Document(rollerCoastersDoc)
    sharedModelManager = new SharedModelDocumentManager()
    docContent = DocumentContentModel.create({}, { sharedModelManager })
    docContent.setRowCreator(() => FreeTileRow.create())
    sharedModelManager.setDocument(docContent)

    // load shared models into sharedModelManager
    v2Document.contexts.forEach(({ guid }) => {
      const { data, metadata } = v2Document.getDataAndMetadata(guid)
      data && sharedModelManager!.addSharedModel(data)
      metadata?.setData(data?.dataSet)
      metadata && sharedModelManager!.addSharedModel(metadata)
    })

    mockInsertTile.mockClear()
  })

  it("handles empty components", () => {
    const noTile = v2MapImporter({
      v2Component: {} as any,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(0)
    const mapModel = isMapContentModel(noTile?.content) ? noTile?.content : undefined
    expect(mapModel).not.toBeDefined()
  })

  it("imports current v2 map components", () => {
    const tile = v2MapImporter({
      v2Component: firstMapComponent(v2Document),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
    expect(mapModel).toBeDefined()
    expect(mapModel?.layers.length).toBe(2)
  })
})
