import { when } from "mobx"
import { getSnapshot, Instance } from "mobx-state-tree"
import "../../components/calculator/calculator-registration"
import "../../components/case-card/case-card-registration"
import "../../components/case-table/case-table-registration"
import "../../components/graph/graph-registration"
import "../../components/map/map-registration"
import "../../components/slider/slider-registration"
import "../../components/text/text-registration"
import "../../components/web-view/web-view-registration"
import { Logger } from "../../lib/logger"
import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { IDataSet } from "../../models/data/data-set"
import { getUndoStringKey } from "../../models/history/codap-undo-types"
import { TreeManager } from "../../models/history/tree-manager"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { CsvParseResult, downloadCsvFile } from "../../utilities/csv-import"
import { processAction } from "../data-interactive-request-processor"

jest.mock("../../utilities/csv-import", () => {
  const originalModule = jest.requireActual("../../utilities/csv-import")
  return { __esModule: true, ...originalModule, downloadCsvFile: jest.fn() }
})
const mockedDownloadCsvFile = downloadCsvFile as jest.MockedFunction<typeof downloadCsvFile>

describe("plugin API requests that change the document", () => {
  const { document } = appState
  let dataset: IDataSet
  let graph: string
  let scatterPlot: string

  async function historySettled() {
    const manager = document.treeManagerAPI as Instance<typeof TreeManager>
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 2000 })
  }

  const undoManager = () => document.treeManagerAPI!.undoManager
  const tileId = (resource: string) => resource.replace(/^component\[|\]$/g, "")

  async function undo() {
    undoManager().undo()
    await historySettled()
  }

  async function redo() {
    undoManager().redo()
    await historySettled()
  }

  // the number of undo entries a request adds; the request must change the document
  async function undoEntriesAdded(action: string, resource: string, values?: any) {
    await historySettled()
    const before = document.treeManagerAPI!.undoManager.undoLevels
    const snapshotBefore = JSON.stringify(getSnapshot(document))
    const result = await processAction({ action, resource, values } as any)
    expect(result.success).toBe(true)
    await historySettled()
    expect(JSON.stringify(getSnapshot(document))).not.toBe(snapshotBefore)
    return document.treeManagerAPI!.undoManager.undoLevels - before
  }

  beforeAll(async () => {
    const source = setupTestDataset().dataset
    source.prepareSnapshot()
    dataset = document.content!.createDataSet(getSnapshot(source)).sharedDataSet.dataSet
    document.treeMonitor!.enableMonitoring()
    const createGraph = async (values: any) => {
      const result = await processAction({ action: "create", resource: "component",
        values: { type: "graph", dataContext: dataset.name, ...values } })
      return `component[${(result.values as any).id}]`
    }
    graph = await createGraph({ xAttributeName: "a3" })
    scatterPlot = await createGraph({ xAttributeName: "a3", yAttributeName: "a4" })
  })

  afterAll(() => {
    document.treeMonitor!.disableMonitoring()
  })

  // update shows the deleted adornment again and changes a setting
  it.each([
    ["Count", { percentType: "cell" }], ["Mean", {}], ["Median", {}], ["Standard Deviation", {}],
    ["Plotted Value", {}], ["Region of Interest", { primary: { position: 1, extent: 2 } }]
  ])("create, delete and update adornment %s add no undo entries", async (type, updateValues) => {
    expect(await undoEntriesAdded("create", `${graph}.adornment`, { type })).toBe(0)
    expect(await undoEntriesAdded("delete", `${graph}.adornment`, { type })).toBe(0)
    expect(await undoEntriesAdded("update", `${graph}.adornment`, { type, isVisible: true, ...updateValues })).toBe(0)
  })

  it("create, update and delete adornment LSRL and Movable Value add no undo entries", async () => {
    expect(await undoEntriesAdded("create", `${scatterPlot}.adornment`, { type: "LSRL" })).toBe(0)
    expect(await undoEntriesAdded("update", `${scatterPlot}.adornment`,
      { type: "LSRL", showR: true, showRSquared: true })).toBe(0)
    expect(await undoEntriesAdded("delete", `${scatterPlot}.adornment`, { type: "LSRL" })).toBe(0)
    expect(await undoEntriesAdded("create", `${graph}.adornment`, { type: "Movable Value" })).toBe(0)
    expect(await undoEntriesAdded("update", `${graph}.adornment`,
      { type: "Movable Value", values: [["{}", 2.5]] })).toBe(0)
    expect(await undoEntriesAdded("delete", `${graph}.adornment`, { type: "Movable Value" })).toBe(0)
  })

  it("create global adds no undo entry", async () => {
    expect(await undoEntriesAdded("create", "global", { name: "historyTest", value: 3 })).toBe(0)
  })

  it("create dataContextFromURL adds no undo entry", async () => {
    gDataBroker.setSharedModelManager(getSharedModelManager(document)!)
    mockedDownloadCsvFile.mockImplementation((url, onComplete) => {
      const parseResult: CsvParseResult = {
        data: [{ col1: "value1" }],
        errors: [],
        meta: { delimiter: "", linebreak: "", aborted: false, truncated: false, cursor: 0 }
      }
      onComplete(parseResult, "")
    })
    expect(await undoEntriesAdded("create", "dataContextFromURL", { URL: "https://example.com/data.csv" })).toBe(0)
  })

  it("a graph autoScale that moves the axes adds one labeled undo entry and sends rescaleGraph, as in V2",
    async () => {
    const tile = document.content!.getTile(tileId(scatterPlot))
    const graphContent: any = tile?.content
    graphContent.applyModelChange(() => graphContent.getAxis("bottom")?.setDomain(-1000, 1000))
    const broadcastSpy = jest.spyOn(document.content!, "broadcastMessage")
    expect(await undoEntriesAdded("notify", scatterPlot, { request: "autoScale" })).toBe(1)
    expect(getUndoStringKey(undoManager())).toBe("DG.Undo.axisDilate")
    expect(broadcastSpy.mock.calls.map(([message]) => message.values?.operation)).toContain("rescaleGraph")
    broadcastSpy.mockRestore()
  })

  it("update attributeLocation adds an undo entry, as in V2", async () => {
    const collection = dataset.getCollectionForAttribute(dataset.attrIDFromName("a4")!)!
    const attrNames = () => collection.attributes.map(attr => attr?.name)
    const before = attrNames()
    expect(await undoEntriesAdded("update", `dataContext[${dataset.name}].attributeLocation[a4]`,
      { position: 0 })).toBe(1)
    expect(getUndoStringKey(undoManager())).toBe("DG.Undo.dataContext.moveAttribute")
    expect(attrNames()).not.toEqual(before)
    await undo()
    expect(attrNames()).toEqual(before)
  })

  it("update attributeLocation into another collection adds an undo entry, as in V2, and undo restores the collections",
    async () => {
    const collectionNames = () => dataset.collections.map(collection => collection.name)
    const collectionAttrs = () => dataset.collections.map(collection => collection.attributes.map(attr => attr?.name))
    const childCaseCount = () => dataset.getCollectionByName("collection2")?.caseIds.length
    const namesBefore = collectionNames()
    const attrsBefore = collectionAttrs()
    expect(childCaseCount()).toBe(4)
    expect(await undoEntriesAdded("update", `dataContext[${dataset.name}].attributeLocation[a2]`,
      { collection: "collection1" })).toBe(1)
    expect(getUndoStringKey(undoManager())).toBe("DG.Undo.dataContext.moveAttribute")
    expect(collectionNames()).not.toContain("collection2")
    await undo()
    expect(collectionNames()).toEqual(namesBefore)
    expect(collectionAttrs()).toEqual(attrsBefore)
    expect(childCaseCount()).toBe(4)
  })

  it.each([
    ["graph", "graphComponent.create"], ["text", "textComponent.create"], ["slider", "sliderComponent.create"],
    ["calculator", "toggleComponent.add.calcView"], ["webView", "webView.show"], ["game", "game.add"],
    ["imageComponentView", "imageComponent.show"], ["map", "map.create"]
  ])("create component %s adds an undo entry, as in V2, and undo removes it", async (type, undoKey) => {
    const tileCount = () => document.content!.tileMap.size
    const countBefore = tileCount()
    expect(await undoEntriesAdded("create", "component",
      { type, dataContext: dataset.name, URL: "https://example.com" })).toBe(1)
    expect(getUndoStringKey(undoManager())).toBe(`DG.Undo.${undoKey}`)
    expect(tileCount()).toBe(countBefore + 1)
    await undo()
    expect(tileCount()).toBe(countBefore)
    await redo()
    expect(tileCount()).toBe(countBefore + 1)
  })

  it("create component calculator when one is showing hides it, labeled as a hide, as in V2", async () => {
    const content = document.content!
    const calculator = () => content.getTilesOfType("Calculator")[0]
    if (!calculator() || content.isTileHidden(calculator().id)) {
      await undoEntriesAdded("create", "component", { type: "calculator" })
    }
    expect(content.isTileHidden(calculator().id)).toBe(false)
    expect(await undoEntriesAdded("create", "component", { type: "calculator" })).toBe(1)
    expect(getUndoStringKey(undoManager())).toBe("DG.Undo.toggleComponent.delete.calcView")
    expect(content.isTileHidden(calculator().id)).toBe(true)
    await undo()
    expect(content.isTileHidden(calculator().id)).toBe(false)
  })

  it("create and delete component are logged, as from the toolbar and close box", async () => {
    const loggerSpy = jest.spyOn(Logger, "log").mockImplementation(() => null)
    try {
      const result = await processAction({ action: "create", resource: "component", values: { type: "text" } })
      const text = `component[${(result.values as any).id}]`
      await processAction({ action: "delete", resource: text })
      await historySettled()
      const messages = loggerSpy.mock.calls.map(([message]) => message)
      expect(messages).toEqual(expect.arrayContaining(["Create component: CodapText", "Close component: CodapText"]))
    } finally {
      loggerSpy.mockRestore()
    }
  })

  it.each(["caseTable", "caseCard", "guideView"])("create component %s adds no undo entry, as in V2", async type => {
    expect(await undoEntriesAdded("create", "component",
      { type, dataContext: dataset.name, URL: "https://example.com" })).toBe(0)
  })

  it("delete component adds an undo entry, as in V2, and undo restores it", async () => {
    const id = tileId(graph)
    expect(document.content!.getTile(id)).toBeDefined()
    expect(await undoEntriesAdded("delete", graph)).toBe(1)
    expect(getUndoStringKey(undoManager())).toBe("DG.Undo.component.close")
    expect(document.content!.getTile(id)).toBeUndefined()
    await undo()
    expect(document.content!.getTile(id)).toBeDefined()
    await redo()
    expect(document.content!.getTile(id)).toBeUndefined()
    await undo()
  })
})
