import { isObject, transform } from "lodash"
import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import {
  ICodapV2DocumentJson, ICodapV2MapComponent } from "../../v2/codap-v2-types"
import { isMapContentModel } from "./models/map-content-model"
import { v2MapExporter } from "./v2-map-exporter"
import { v2MapImporter } from "./v2-map-importer"

import "./map-registration"

const fs = require("fs")
const path = require("path")

// Passing true logs the graph title and the last title logged is the failing graph.
// Passing tests should be silent, however, so false is passed by default.
function logMapTitleMaybe(log: boolean, v2MapTile: ICodapV2MapComponent) {
  // eslint-disable-next-line no-console
  log && console.log("v2MapTile:", v2MapTile.componentStorage.title || v2MapTile.componentStorage.name)
}

function transformObject(obj: any, keysToRemove: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => transformObject(item, keysToRemove))
  }
  if (isObject(obj)) {
    return transform<any, any>(obj, (result, value, key) => {
      // omit showMeasureLabels if false; v2 treats false/undefined interchangeably
      const isFalseShowMeasureLabels = key === "showMeasureLabels" && !value
      // properties in `keysToRound` are rounded to two decimal places for comparison
      if (!keysToRemove.includes(key) && !isFalseShowMeasureLabels) {
        result[key] = transformObject(value, keysToRemove)
      }
    })
  }
  return obj
};


const mockInsertTile = jest.fn()

function loadCodapDocument(fileName: string) {
  const file = path.join(__dirname, "../../test/v2", fileName)
  const json = fs.readFileSync(file, "utf8")
  const parsed = safeJsonParse<ICodapV2DocumentJson>(json)!
  const v2Document = new CodapV2Document(parsed)

  const sharedModelManager = new SharedModelDocumentManager()
  const docContent = DocumentContentModel.create({}, { sharedModelManager })
  docContent.setRowCreator(() => FreeTileRow.create())
  sharedModelManager.setDocument(docContent)

  mockInsertTile.mockImplementation((tileSnap: ITileModelSnapshotIn) => {
    const tile = docContent.insertTileSnapshotInDefaultRow(tileSnap)
    return tile
  })

  // load shared models into sharedModelManager
  v2Document.dataContexts.forEach(({ guid }) => {
    const { data, metadata } = v2Document.getDataAndMetadata(guid)
    data && sharedModelManager.addSharedModel(data)
    metadata?.setData(data?.dataSet)
    metadata && sharedModelManager.addSharedModel(metadata)
  })

  return { v2Document }
}

function firstMapComponent(v2Document: CodapV2Document) {
  return v2Document.components.find(c => c.type === "DG.MapView")!
}

describe("V2MapImporter imports legacy v2 map documents", () => {
  it("imports legacy v2 map components", () => {
    const { v2Document } = loadCodapDocument("seal-and-shark-demo.codap")
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
  const kIgnoreProps = [
    // standard properties handled externally
    "cannotClose", "name", "title", "userSetTitle",
    // ...kNotImplementedProps
  ]

  beforeEach(() => {
    mockInsertTile.mockRestore()
  })

  it("handles empty components", () => {
    const { v2Document } = loadCodapDocument("roller-coasters-map.codap")
    const noTile = v2MapImporter({
      v2Component: {} as any,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(0)
    const mapModel = isMapContentModel(noTile?.content) ? noTile?.content : undefined
    expect(mapModel).not.toBeDefined()
  })

  it("exports/imports default map component", () => {
    const { v2Document } = loadCodapDocument("roller-coasters-map.codap")
    const v2MapTiles = v2Document.components.filter(c => c.type === "DG.MapView")
    v2MapTiles.forEach(v2MapTile => {
      logMapTitleMaybe(false, v2MapTile)
      const v3MapTile = v2MapImporter({
        v2Component: v2MapTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every map component
      const v2MapTileOut = v2MapExporter({ tile: v3MapTile! })
      const v2MapTileStorage = transformObject(v2MapTile.componentStorage, kIgnoreProps)
      const v2MapTileOutStorage = transformObject(v2MapTileOut?.componentStorage, kIgnoreProps)
      expect(v2MapTileOutStorage).toEqual(v2MapTileStorage)
    })
  })

  it("exports/imports map layer formats", () => {
    const { v2Document } = loadCodapDocument("roller-coasters-map-layer-formats.codap")
    const v2MapTiles = v2Document.components.filter(c => c.type === "DG.MapView")
    v2MapTiles.forEach(v2MapTile => {
      logMapTitleMaybe(false, v2MapTile)
      const v3MapTile = v2MapImporter({
        v2Component: v2MapTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every map component
      const v2MapTileOut = v2MapExporter({ tile: v3MapTile! })
      const v2MapTileStorage = transformObject(v2MapTile.componentStorage, kIgnoreProps)
      const v2MapTileOutStorage = transformObject(v2MapTileOut?.componentStorage, kIgnoreProps)
      expect(v2MapTileOutStorage).toEqual(v2MapTileStorage)
    })
  })

  it("exports/imports map measures", () => {
    const { v2Document } = loadCodapDocument("roller-coasters-map-measures.codap")
    const v2MapTiles = v2Document.components.filter(c => c.type === "DG.MapView")
    v2MapTiles.forEach(v2MapTile => {
      logMapTitleMaybe(false, v2MapTile)
      const v3MapTile = v2MapImporter({
        v2Component: v2MapTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every map component
      const v2MapTileOut = v2MapExporter({ tile: v3MapTile! })
      const v2MapTileStorage = transformObject(v2MapTile.componentStorage, kIgnoreProps)
      const v2MapTileOutStorage = transformObject(v2MapTileOut?.componentStorage, kIgnoreProps)
      expect(v2MapTileOutStorage).toEqual(v2MapTileStorage)
    })
  })
})
