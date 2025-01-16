import { DocumentContentModel, IDocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ICodapV2DocumentJson, ICodapV2MapLayerStorage, ICodapV2MapPointLayerStorage, ICodapV2MapPolygonLayerStorage,
          ICodapV2MapStorage, isV2MapCurrentStorage, isV2MapPointLayerStorage, isV2MapPolygonLayerStorage }
    from "../../v2/codap-v2-types"
import { isMapContentModel } from "./models/map-content-model"
import { v2MapImporter } from "./v2-map-importer"
import { v2MapExporter } from "./v2-map-exporter"
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
    v2Document.dataContexts.forEach(({ guid }) => {
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

describe("imports/exports to current v2 map documents", () => {
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
    v2Document.dataContexts.forEach(({ guid }) => {
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

  it("exports a V2 map component and re-imports it correctly", () => {
    const importedTile = v2MapImporter({
      v2Component: firstMapComponent(v2Document),
      v2Document,
      insertTile: mockInsertTile
    })

    type IMapModelStorage = {
      center: { lat: number, lng: number } | [lat: number, lng: number]
      zoom: number
      baseMapLayerName: string
      // TODO_V2_IMPORT: gridMultiplier is not imported at this level
      // It appears 8,612 times in cfm-shared either here or
      // inside of the grid object
      gridMultiplier: number
      layerModels: ICodapV2MapLayerStorage[]
    }

    expect(importedTile).toBeDefined()
    expect(isMapContentModel(importedTile?.content)).toBe(true)

    // Step 2: Export to V2
    const exportedV2Map = v2MapExporter({ tile: importedTile! })

    expect(exportedV2Map).toBeDefined()
    expect(exportedV2Map?.type).toBe("DG.MapView")
    const mapStorage = exportedV2Map?.componentStorage as ICodapV2MapStorage
    let mapModelStorage: IMapModelStorage | undefined
    let layerModels: ICodapV2MapLayerStorage[] = []
    if (isV2MapCurrentStorage(mapStorage)) {
      mapModelStorage = mapStorage.mapModelStorage
      layerModels = mapModelStorage.layerModels
    }
    expect(mapModelStorage).toBeDefined()
    expect(layerModels.length).toBe(2)


    const polygonLayer = layerModels[0] as ICodapV2MapPolygonLayerStorage
    const isFirstPolygon = isV2MapPolygonLayerStorage(polygonLayer)
    expect(isFirstPolygon).toBe(true)
    expect(polygonLayer.areaColor).toBeDefined()
    expect(typeof polygonLayer.areaColor).toBe("string")

    // Validate that the second layer is a Point Layer
    const pointLayer = layerModels[1] as ICodapV2MapPointLayerStorage
    const isSecondPoint = isV2MapPointLayerStorage(layerModels[1])
    expect(isSecondPoint).toBe(true)
    expect(pointLayer.pointColor).toBeDefined()
    expect(typeof pointLayer.pointColor).toBe("string")
  })
})
