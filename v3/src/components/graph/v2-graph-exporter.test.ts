import { isObject, transform } from "lodash"
import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ICodapV2DocumentJson, ICodapV2GraphComponent } from "../../v2/codap-v2-types"
import { v2GraphExporter } from "./v2-graph-exporter"
import { v2GraphImporter } from "./v2-graph-importer"
import "./graph-registration"

const fs = require("fs")
const path = require("path")

// When working on these tests, it's critical to know what graph instance is failing.
// Passing true logs the graph title and the last title logged is the failing graph.
// Passing tests should be silent, however, so false is passed by default.
function logGraphTitleMaybe(log: boolean, v2GraphTile: ICodapV2GraphComponent) {
  // eslint-disable-next-line no-console
  log && console.log("v2GraphTile:", v2GraphTile.componentStorage.title || v2GraphTile.componentStorage.name)
}

function transformObject(obj: any, keysToRemove: string[], keysToRound: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => transformObject(item, keysToRemove, keysToRound))
  }
  if (isObject(obj)) {
    return transform<any, any>(obj, (result, value, key) => {
      // omit showMeasureLabels if false; v2 treats false/undefined interchangeably
      const isFalseShowMeasureLabels = key === "showMeasureLabels" && !value
      // properties in `keysToRound` are rounded to two decimal places for comparison
      if (keysToRound.includes(key) && typeof value === "number") {
        result[key] = Math.round(100 * value) / 100
      }
      // properties we don't care to compare are removed before comparison
      else if (!keysToRemove.includes(key) && !isFalseShowMeasureLabels) {
        result[key] = transformObject(value, keysToRemove, keysToRound)
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

describe("V2GraphImporter", () => {

  // to be implemented in future PRs
  const kNotImplementedProps = [
    "numberOfLegendQuantiles",
    "legendQuantilesAreLocked",
    "plotBackgroundImage",
    "plotBackgroundImageLockInfo",
    // computable from other properties, plus v2 writes out some unexpected values
    "totalNumberOfBins"
  ]
  const kIgnoreProps = [
    // standard properties handled externally
    "cannotClose", "name", "title", "userSetTitle",
    ...kNotImplementedProps
  ]

  // keys rounded to two decimal places for comparison
  const kRoundProps = ["proportionX", "proportionY"]

  beforeEach(() => {
    mockInsertTile.mockRestore()
  })

  it("exports graph components without legends", () => {
    const { v2Document } = loadCodapDocument("mammals-all-graphs.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with categorical legends", () => {
    const { v2Document } = loadCodapDocument("mammals-all-diet-legends.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with numeric legends", () => {
    const { v2Document } = loadCodapDocument("mammals-all-diet-legends.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with bar charts", () => {
    const { v2Document } = loadCodapDocument("mammals-bar-charts.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with dot plots", () => {
    const { v2Document } = loadCodapDocument("mammals-dot-plots.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with simple adornments", () => {
    const { v2Document } = loadCodapDocument("mammals-simple-adornments.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with LSLR adornments", () => {
    const { v2Document } = loadCodapDocument("mammals-lsrl-adornment.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with movable line and point adornments", () => {
    const { v2Document } = loadCodapDocument("mammals-movable-line-point-adornments.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with adornment labels", () => {
    const { v2Document } = loadCodapDocument("mammals-adornment-labels.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with plot formatting", () => {
    const { v2Document } = loadCodapDocument("mammals-graph-formats.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps)
      const v2GraphTileOutStorage = transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })
})
