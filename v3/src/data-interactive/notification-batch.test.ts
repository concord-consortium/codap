import { when } from "mobx"
import { getSnapshot, Instance } from "mobx-state-tree"
import { appState } from "../models/app-state"
import { IDataSet } from "../models/data/data-set"
import { GlobalValue } from "../models/global/global-value"
import { GlobalValueManager } from "../models/global/global-value-manager"
import { TreeManager } from "../models/history/tree-manager"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import { setupTestDataset } from "../test/dataset-test-utils"
import { registerDIHandler } from "./data-interactive-handler"
import { processAction, processRequest } from "./data-interactive-request-processor"
import { beginNoticeBatch, endNoticeBatch, sendNotice, withNoticeBatch } from "./notification-batch"
import { notification } from "./notification-utils"

describe("sendNotice", () => {
  const notify = jest.fn()
  // notices as the plugin API sends them; their values don't match the core notification types
  const dataNotice = (context: string, operation: string): any =>
    ({ action: "notify", resource: `dataContextChangeNotice[${context}]`, values: [{ operation, result: {} }] })
  const otherNotice = (operation: string): any => ({ action: "notify", resource: "component", values: { operation } })
  const sent = () => notify.mock.calls.map(([message, , target, exclude]) =>
    [message.resource, ([] as any[]).concat(message.values).map(({ operation }) => operation), target, exclude])

  beforeEach(() => notify.mockClear())

  it("sends a notice at once outside a batch", () => {
    sendNotice(notify, dataNotice("A", "createCases"), jest.fn())
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it("combines each data context's notices for the same recipients in the first one's place", () => {
    const callbacks = [jest.fn(), jest.fn(), jest.fn()]
    withNoticeBatch(() => {
      sendNotice(notify, dataNotice("A", "createCases"), callbacks[0])
      sendNotice(notify, otherNotice("create"), jest.fn())
      sendNotice(notify, dataNotice("B", "updateCases"), jest.fn())
      sendNotice(notify, dataNotice("A", "createItems"), callbacks[1])
      // a notice that leaves out a plugin goes to different recipients
      sendNotice(notify, dataNotice("A", "deleteCases"), callbacks[2], undefined, "TILE")
      expect(notify).not.toHaveBeenCalled()
    })
    expect(sent()).toEqual([
      ["dataContextChangeNotice[A]", ["createCases", "createItems"], undefined, undefined],
      ["component", ["create"], undefined, undefined],
      ["dataContextChangeNotice[B]", ["updateCases"], undefined, undefined],
      ["dataContextChangeNotice[A]", ["deleteCases"], undefined, "TILE"]
    ])
    // each plugin's reply reaches the callback of every notice combined into it
    notify.mock.calls[0][1]({ success: true })
    expect(callbacks[0]).toHaveBeenCalledWith({ success: true })
    expect(callbacks[1]).toHaveBeenCalledWith({ success: true })
    expect(callbacks[2]).not.toHaveBeenCalled()
  })

  it("doesn't combine notices of other kinds", () => {
    withNoticeBatch(() => {
      sendNotice(notify, otherNotice("create"), jest.fn())
      sendNotice(notify, otherNotice("delete"), jest.fn())
    })
    expect(sent().map(([, operations]) => operations)).toEqual([["create"], ["delete"]])
  })

  it("doesn't combine data notices with a different action, notify function or target", () => {
    const otherNotify = jest.fn()
    withNoticeBatch(() => {
      sendNotice(notify, dataNotice("A", "createCases"), jest.fn())
      sendNotice(notify, { ...dataNotice("A", "updateCases"), action: "other" }, jest.fn())
      sendNotice(otherNotify, dataNotice("A", "deleteCases"), jest.fn())
      sendNotice(notify, dataNotice("A", "createItems"), jest.fn(), "TILE")
      sendNotice(notify, dataNotice("A", "updateItems"), jest.fn(), "TILE")
    })
    expect(sent()).toEqual([
      ["dataContextChangeNotice[A]", ["createCases"], undefined, undefined],
      ["dataContextChangeNotice[A]", ["updateCases"], undefined, undefined],
      ["dataContextChangeNotice[A]", ["createItems", "updateItems"], "TILE", undefined]
    ])
    expect(otherNotify).toHaveBeenCalledTimes(1)
  })

  it("sends the notices when the outermost batch ends, even if it throws", () => {
    beginNoticeBatch()
    try {
      withNoticeBatch(() => sendNotice(notify, dataNotice("A", "createCases"), jest.fn()))
      expect(notify).not.toHaveBeenCalled()
    } finally {
      endNoticeBatch()
    }
    expect(notify).toHaveBeenCalledTimes(1)

    expect(() => withNoticeBatch(() => {
      sendNotice(notify, dataNotice("A", "updateCases"), jest.fn())
      throw new Error("oops")
    })).toThrow("oops")
    expect(notify).toHaveBeenCalledTimes(2)
  })

  it("sends the rest of the notices when one fails to send, without hiding the change's exception", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => null)
    const failingNotify = jest.fn(() => { throw new Error("can't send") })
    try {
      expect(() => withNoticeBatch(() => {
        sendNotice(failingNotify, dataNotice("A", "createCases"), jest.fn())
        sendNotice(notify, dataNotice("B", "updateCases"), jest.fn())
        throw new Error("oops")
      })).toThrow("oops")
      expect(failingNotify).toHaveBeenCalledTimes(1)
      expect(sent()).toEqual([["dataContextChangeNotice[B]", ["updateCases"], undefined, undefined]])
      expect(warnSpy).toHaveBeenCalledTimes(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it("calls every combined notice's callback when one of them throws", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => null)
    const callbacks = [jest.fn(() => { throw new Error("oops") }), jest.fn()]
    try {
      withNoticeBatch(() => {
        sendNotice(notify, dataNotice("A", "createCases"), callbacks[0])
        sendNotice(notify, dataNotice("A", "createItems"), callbacks[1])
      })
      notify.mock.calls[0][1]({ success: true })
      expect(callbacks[0]).toHaveBeenCalledWith({ success: true })
      expect(callbacks[1]).toHaveBeenCalledWith({ success: true })
      expect(warnSpy).toHaveBeenCalledTimes(1)
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe("data context change notices", () => {
  const { content } = appState.document
  let sharedDataSet: ISharedDataSet
  let dataset: IDataSet
  let broadcastSpy: jest.SpyInstance

  beforeEach(() => {
    const source = setupTestDataset().dataset
    source.prepareSnapshot()
    sharedDataSet = content!.createDataSet(getSnapshot(source)).sharedDataSet
    dataset = sharedDataSet.dataSet
    dataset.validateCases()
    broadcastSpy = jest.spyOn(content!, "broadcastMessage")
  })

  afterEach(() => {
    broadcastSpy.mockRestore()
    content!.removeSharedModelsAndTiles([sharedDataSet])
  })

  const notices = () => broadcastSpy.mock.calls
    .map(([message]) => message)
    .filter(message => message.resource === `dataContextChangeNotice[${dataset.name}]`)
  const operationsByNotice = () =>
    notices().map(message => ([] as any[]).concat(message.values).map(({ operation }) => operation))

  const update = (index: number, value: number) => dataset.applyModelChange(
    () => dataset.setCaseValues([{ __id__: dataset.items[index].__id__, a3: value }]),
    { notify: notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "updateCases" }]) })

  it("arrive as one notice for a plugin request's changes, before the reply", async () => {
    registerDIHandler("testTwoChanges", {
      update() {
        update(0, 10)
        update(1, 20)
        return { success: true }
      }
    })
    const reply = processAction({ action: "update", resource: "testTwoChanges" })
    expect(operationsByNotice()).toEqual([["updateCases", "updateCases"]])
    expect(await reply).toEqual({ success: true })
  })

  it("arrive as one notice for each request in an array", async () => {
    const resource = (index: number) => `dataContext[${dataset.name}].collection[collection3].caseByIndex[${index}]`
    const results = await processRequest([
      { action: "update", resource: resource(0), values: { values: { a3: 10 } } },
      { action: "update", resource: resource(1), values: { values: { a3: 20 } } }
    ])
    expect(results).toEqual([{ success: true }, { success: true }])
    expect(operationsByNotice()).toEqual([["updateCases"], ["updateCases"]])
  })

  it("aren't held while a plugin's request waits", async () => {
    let resume = () => {}
    const waiting = new Promise<void>(resolve => { resume = resolve })
    registerDIHandler("testWait", {
      async update() {
        update(0, 10)
        await waiting
        update(1, 20)
        return { success: true }
      }
    })
    const reply = processAction({ action: "update", resource: "testWait" })
    // the change made before the wait has gone out
    expect(operationsByNotice()).toEqual([["updateCases"]])
    await Promise.resolve()
    // a change the user makes while the request waits goes out at once
    update(2, 30)
    expect(operationsByNotice()).toEqual([["updateCases"], ["updateCases"]])
    resume()
    expect(await reply).toEqual({ success: true })
    expect(operationsByNotice()).toEqual([["updateCases"], ["updateCases"], ["updateCases"]])
  })

  it("arrive as one notice for a change and the changes made within it", () => {
    dataset.applyModelChange(() => {
      dataset.applyModelChange(() => null, {
        notify: notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "deleteCases" }]),
        suppressWarning: true
      })
      expect(notices()).toEqual([])
    }, {
      notify: [
        notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "updateCases" }]),
        notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "createCases" }])
      ]
    })
    expect(operationsByNotice()).toEqual([["deleteCases", "updateCases", "createCases"]])
  })

  it("go out for the changes completed within a change that throws, and the exception isn't lost", () => {
    expect(() => dataset.applyModelChange(() => {
      dataset.applyModelChange(() => null, {
        notify: notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "deleteCases" }]),
        suppressWarning: true
      })
      throw new Error("oops")
    }, {
      notify: notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "createCases" }])
    })).toThrow("oops")
    expect(operationsByNotice()).toEqual([["deleteCases"]])
    // the batch closed, so later changes aren't held
    update(1, 20)
    expect(operationsByNotice()).toEqual([["deleteCases"], ["updateCases"]])
  })

  it("arrive separately for changes made separately", () => {
    dataset.applyModelChange(() => null, {
      notify: notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "updateCases" }])
    })
    dataset.applyModelChange(() => null, {
      notify: notification(`dataContextChangeNotice[${dataset.name}]`, [{ operation: "updateCases" }])
    })
    expect(operationsByNotice()).toEqual([["updateCases"], ["updateCases"]])
  })

  it("arrive before undo and redo on document when a plugin's request undoes or redoes a change", async () => {
    const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
    const waitForHistoryEntry = () => when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
    const globals = content!.getFirstSharedModelByType(GlobalValueManager)!
    const global = GlobalValue.create({ name: "batchOrder", value: 1 })
    globals.addValue(global)
    appState.document.treeMonitor!.enableMonitoring()
    try {
      content!.applyModelChange(() => global.setValue(2),
        { undoStringKey: "DG.Undo.slider.change", redoStringKey: "DG.Redo.slider.change" })
      await waitForHistoryEntry()
      broadcastSpy.mockClear()

      for (const operation of ["undoButtonPress", "redoButtonPress"]) {
        await processAction({ action: "notify", resource: "undoChangeNotice", values: { operation } })
        await waitForHistoryEntry()
      }
    } finally {
      appState.document.treeMonitor!.disableMonitoring()
      globals.removeValue(global)
    }
    const order = broadcastSpy.mock.calls.map(([message]) => message)
      .filter(({ resource }) => resource === "global[batchOrder]" || resource === "document")
      .map(({ values }) => values.operation ?? values.globalValue)
    expect(order).toEqual([1, "undo", 2, "redo"])
  })
})
