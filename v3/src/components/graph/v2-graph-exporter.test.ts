import { isObject, transform } from "lodash"
import { DocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { v2GraphExporter } from "./v2-graph-exporter"
import { v2GraphImporter } from "./v2-graph-importer"
import "./graph-registration"

const fs = require("fs")
const path = require("path")

function removePropertiesRecursive(obj: any, keysToRemove: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => removePropertiesRecursive(item, keysToRemove))
  }
  if (isObject(obj)) {
    return transform<any, any>(obj, (result, value, key) => {
      if (!keysToRemove.includes(key)) {
        result[key] = removePropertiesRecursive(value, keysToRemove)
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
    "pointColor",
    "pointSizeMultiplier",
    "plotBackgroundColor",
    "plotBackgroundImage",
    "plotBackgroundImageLockInfo",
    "plotBackgroundOpacity",
    "strokeColor",
    "strokeSameAsFill",
    "isTransparent",
    "transparency",
    "strokeTransparency",
    "showMeasureLabels"
  ]
  const kIgnoreProps = [
    // standard properties handled externally
    "cannotClose", "name", "title", "userSetTitle",
    ...kNotImplementedProps
  ]

  beforeEach(() => {
    mockInsertTile.mockRestore()
  })

  it("exports graph components without legends", () => {
    const { v2Document } = loadCodapDocument("mammals-all-graphs.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      // console.log("v2GraphTile", v2GraphTile.componentStorage.title || v2GraphTile.componentStorage.name)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = removePropertiesRecursive(v2GraphTile.componentStorage, kIgnoreProps)
      const v2GraphTileOutStorage = removePropertiesRecursive(v2GraphTileOut?.componentStorage, kIgnoreProps)
      // console.log("v2GraphTileOutStorage", JSON.stringify(v2GraphTileOutStorage, null, 2))
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with categorical legends", () => {
    const { v2Document } = loadCodapDocument("mammals-all-diet-legends.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      // console.log("v2GraphTile", v2GraphTile.componentStorage.title || v2GraphTile.componentStorage.name)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = removePropertiesRecursive(v2GraphTile.componentStorage, kIgnoreProps)
      const v2GraphTileOutStorage = removePropertiesRecursive(v2GraphTileOut?.componentStorage, kIgnoreProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with numeric legends", () => {
    const { v2Document } = loadCodapDocument("mammals-all-diet-legends.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      // console.log("v2GraphTile", v2GraphTile.componentStorage.title || v2GraphTile.componentStorage.name)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = removePropertiesRecursive(v2GraphTile.componentStorage, kIgnoreProps)
      const v2GraphTileOutStorage = removePropertiesRecursive(v2GraphTileOut?.componentStorage, kIgnoreProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with simple adornments", () => {
    const { v2Document } = loadCodapDocument("mammals-simple-adornments.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      // console.log("v2GraphTile", v2GraphTile.componentStorage.title || v2GraphTile.componentStorage.name)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = removePropertiesRecursive(v2GraphTile.componentStorage, kIgnoreProps)
      const v2GraphTileOutStorage = removePropertiesRecursive(v2GraphTileOut?.componentStorage, kIgnoreProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with LSLR adornments", () => {
    const { v2Document } = loadCodapDocument("mammals-lsrl-adornment.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      // console.log("v2GraphTile", v2GraphTile.componentStorage.title || v2GraphTile.componentStorage.name)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = removePropertiesRecursive(v2GraphTile.componentStorage, kIgnoreProps)
      const v2GraphTileOutStorage = removePropertiesRecursive(v2GraphTileOut?.componentStorage, kIgnoreProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })

  it("exports graph components with movable line and point adornments", () => {
    const { v2Document } = loadCodapDocument("mammals-movable-line-point-adornments.codap")
    const v2GraphTiles = v2Document.components.filter(c => c.type === "DG.GraphView")
    v2GraphTiles.forEach(v2GraphTile => {
      // console.log("v2GraphTile", v2GraphTile.componentStorage.title || v2GraphTile.componentStorage.name)
      const v3GraphTile = v2GraphImporter({
        v2Component: v2GraphTile,
        v2Document,
        insertTile: mockInsertTile
      })
      // tests round-trip import/export of every graph component
      const v2GraphTileOut = v2GraphExporter({ tile: v3GraphTile! })
      const v2GraphTileStorage = removePropertiesRecursive(v2GraphTile.componentStorage, kIgnoreProps)
      const v2GraphTileOutStorage = removePropertiesRecursive(v2GraphTileOut?.componentStorage, kIgnoreProps)
      expect(v2GraphTileOutStorage).toEqual(v2GraphTileStorage)
    })
  })
})
