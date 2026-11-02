import { when } from "mobx"
import { getSnapshot, Instance } from "mobx-state-tree"
import "../../components/case-table/case-table-registration"
import "../../components/graph/graph-registration"
import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
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

// Plugin API changes are meant to stay off the undo history, as in V2 (CODAP-1594 item 5)
describe("plugin API requests that change the document", () => {
  const { document } = appState
  let graph: string
  let scatterPlot: string

  async function historySettled() {
    const manager = document.treeManagerAPI as Instance<typeof TreeManager>
    await when(() => manager.activeHistoryEntries.length === 0, { timeout: 2000 })
  }

  // the number of undo entries a request adds
  async function undoEntriesAdded(action: string, resource: string, values?: any) {
    await historySettled()
    const before = document.treeManagerAPI!.undoManager.undoLevels
    const result = await processAction({ action, resource, values } as any)
    expect(result.success).toBe(true)
    await historySettled()
    return document.treeManagerAPI!.undoManager.undoLevels - before
  }

  beforeAll(async () => {
    const source = setupTestDataset().dataset
    source.prepareSnapshot()
    const dataset = document.content!.createDataSet(getSnapshot(source)).sharedDataSet.dataSet
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

  it.each([
    ["Count", { percentType: "row" }], ["Mean", { isVisible: false }], ["Median", {}],
    ["Standard Deviation", {}], ["Plotted Value", {}], ["Region of Interest", { primary: { position: 1, extent: 2 } }]
  ])("create, update and delete adornment %s add no undo entries", async (type, updateValues) => {
    expect(await undoEntriesAdded("create", `${graph}.adornment`, { type })).toBe(0)
    expect(await undoEntriesAdded("update", `${graph}.adornment`, { type, ...updateValues })).toBe(0)
    expect(await undoEntriesAdded("delete", `${graph}.adornment`, { type })).toBe(0)
  })

  it("create, update and delete adornment LSRL and Movable Value add no undo entries", async () => {
    expect(await undoEntriesAdded("create", `${scatterPlot}.adornment`, { type: "LSRL" })).toBe(0)
    expect(await undoEntriesAdded("update", `${scatterPlot}.adornment`,
      { type: "LSRL", showR: true, showRSquared: true })).toBe(0)
    expect(await undoEntriesAdded("delete", `${scatterPlot}.adornment`, { type: "LSRL" })).toBe(0)
    expect(await undoEntriesAdded("create", `${graph}.adornment`, { type: "Movable Value" })).toBe(0)
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

  it("a graph autoScale that moves the axes stays undoable, as in V2", async () => {
    const tile = document.content!.getTile(scatterPlot.replace(/^component\[|\]$/g, ""))
    const graphContent: any = tile?.content
    graphContent.applyModelChange(() => graphContent.getAxis("bottom")?.setDomain(-1000, 1000))
    expect(await undoEntriesAdded("notify", scatterPlot, { request: "autoScale" })).toBe(1)
  })
})
