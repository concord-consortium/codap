import { isObject, transform } from "lodash"
import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2DataSetImporter, getCaseDataFromV2ContextGuid } from "../../v2/codap-v2-data-set-importer"
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

function transformObject(obj: any, keysToRemove: string[], keysToRound: string[],
                           keysWithOptionalBooleans: string[], keysWithOptionalNull: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item =>
              transformObject(item, keysToRemove, keysToRound, keysWithOptionalBooleans, keysWithOptionalNull))
  }
  if (isObject(obj)) {
    return transform<any, any>(obj, (result, value, key) => {
      // omit showMeasureLabels if false; v2 treats false/undefined interchangeably
      const isFalseShowMeasureLabels = key === "showMeasureLabels" && !value
      // Handle optional booleans: treat false and undefined as equivalent
      if (keysWithOptionalBooleans.includes(key) && (value === false || value === undefined)) {
        return { ...result, [key]: false } // Normalize to `false`
      }
      // treat null and undefined as equivalent
      if (keysWithOptionalNull.includes(key) && (value === null || value === undefined)) {
        return { ...result, [key]: null } // Normalize to `null`
      }
      // properties in `keysToRound` are rounded to two decimal places for comparison
      if (keysToRound.includes(key) && typeof value === "number") {
        result[key] = Math.round(100 * value) / 100
      }
      // properties we don't care to compare are removed before comparison
      else if (!keysToRemove.includes(key) && !isFalseShowMeasureLabels) {
        result[key] = transformObject(value, keysToRemove, keysToRound, keysWithOptionalBooleans, keysWithOptionalNull)
      }

    })
  }
  return obj
};

const mockGetCaseData = jest.fn()
const mockGetGlobalValues = jest.fn()
const mockInsertTile = jest.fn()
const mockLinkSharedModel = jest.fn()
const mockImporterArgs = {
  getCaseData: mockGetCaseData,
  getGlobalValues: mockGetGlobalValues,
  insertTile: mockInsertTile,
  linkSharedModel: mockLinkSharedModel
}
const resetMocks = () => {
  mockGetCaseData.mockReset()
  mockGetGlobalValues.mockReset()
  mockInsertTile.mockReset()
  mockLinkSharedModel.mockReset()
}

function loadCodapDocument(fileName: string) {
  const file = path.join(__dirname, "../../test/v2", fileName)
  const json = fs.readFileSync(file, "utf8")
  const parsed = safeJsonParse<ICodapV2DocumentJson>(json)!
  const v2Document = new CodapV2Document(parsed)

  const sharedModelManager = new SharedModelDocumentManager()
  const docContent = DocumentContentModel.create({}, { sharedModelManager })
  docContent.setRowCreator(() => FreeTileRow.create())
  sharedModelManager.setDocument(docContent)

  mockGetCaseData.mockImplementation((dataContextGuid: number) => {
    // This function simulates retrieving case data from a shared model based on the data context GUID
    return getCaseDataFromV2ContextGuid(dataContextGuid, sharedModelManager)
  })

  mockInsertTile.mockImplementation((tileSnap: ITileModelSnapshotIn) => {
    const tile = docContent.insertTileSnapshotInDefaultRow(tileSnap)
    return tile
  })

  // load shared models into sharedModelManager
  const dataSetImporter = new CodapV2DataSetImporter(v2Document.guidMap)
  v2Document.dataContexts.forEach((context) => {
    dataSetImporter.importContext(context, sharedModelManager)
  })

  return { v2Document }
}

describe("V2GraphImporter", () => {

  // to be implemented in future PRs
  const kNotImplementedProps = [
    // computable from other properties, plus v2 writes out some unexpected values
    "totalNumberOfBins"
  ]
  const kIgnoreProps = [
    // standard properties handled externally
    "cannotClose", "name", "title", "userSetTitle",
    // v3 extensions aren't expected to round-trip
    "v3",
    ...kNotImplementedProps
  ]

  // keys rounded to two decimal places for comparison
  const kRoundProps = ["proportionX", "proportionY"]
  // keys that are booleans but can be undefined
  const kOptionalBooleans = [ "enableNumberToggle", "numberToggleLastMode",]
  // keys that are null but can be undefined
  const kOptionalNull = ["plotBackgroundImage", "plotBackgroundImageLockInfo"]

  beforeEach(() => {
    resetMocks()
  })

  it("exports graph components without legends", () => {
    const { v2Document } = loadCodapDocument("mammals-all-graphs.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      logGraphTitleMaybe(false, v2GraphTile)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
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
        ...mockImporterArgs
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage =
              transformObject(v2GraphTile.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans, kOptionalNull)
      const v2GraphTileOutStorage =
              transformObject(v2GraphTileOut?.componentStorage, kIgnoreProps, kRoundProps, kOptionalBooleans,
                                kOptionalNull)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })
})
