import { when } from "mobx"
import { getSnapshot, Instance } from "mobx-state-tree"
import {
  processAction, ProcessActionOptions, processRequest
} from "../../data-interactive/data-interactive-request-processor"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { DIAction, DIComponentInfo } from "../../data-interactive/data-interactive-types"
import {
  endUndoRedoAnswer, isAnsweringUndoRedo, kUndoRedoAnswerGraceMs
} from "../../data-interactive/undo-redo-answer"
import { kHostPageId } from "../../lib/embedded-mode/embedded-mode-registry"
import { ICoreNotification } from "../../data-interactive/notification-core-types"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { appState } from "../app-state"
import { GlobalValue } from "../global/global-value"
import { GlobalValueManager } from "../global/global-value-manager"
import { registerCustomUndoRedo } from "../history/custom-undo-redo-registry"
import { TreeManager } from "../history/tree-manager"
import { withCustomUndoRedo } from "../history/with-custom-undo-redo"
import "../../register-tile-types"

// What plugins hear when a change is undone or redone, and when a change that can't be undone
// clears the redo list
describe("undo and redo notices", () => {
  const { document } = appState
  let broadcastSpy: jest.SpyInstance
  let global: Instance<typeof GlobalValue>

  beforeAll(() => {
    const manager = document.content!.getFirstSharedModelByType(GlobalValueManager)!
    global = GlobalValue.create({ name: "undoRedoNotices", value: 1 })
    manager.addValue(global)
  })

  beforeEach(() => {
    document.treeMonitor!.enableMonitoring()
    broadcastSpy = jest.spyOn(document.content!, "broadcastMessage")
  })

  afterEach(() => {
    broadcastSpy.mockRestore()
    document.treeMonitor!.disableMonitoring()
  })

  const historySettled = () => {
    const manager = document.treeManagerAPI as Instance<typeof TreeManager>
    return when(() => manager.activeHistoryEntries.length === 0, { timeout: 2000 })
  }
  const undoableChange = async (value: number) => {
    document.content!.applyModelChange(() => global.setValue(value),
      { undoStringKey: "DG.Undo.slider.change", redoStringKey: "DG.Redo.slider.change" })
    await historySettled()
  }
  const changeThatCantBeUndone = async (value: number, options?: { noDirty?: boolean, keepRedo?: boolean }) => {
    document.content!.applyModelChange(() => global.setValue(value), options)
    await historySettled()
  }
  const undo = async () => { document.undoLastAction(); await historySettled() }
  const redo = async () => { document.redoLastAction(); await historySettled() }
  // the broadcasts of the given resources, as [resource, values]
  const notices = (...resources: string[]) => broadcastSpy.mock.calls.map(([message]) => message)
    .filter(({ resource }) => resources.includes(resource))
    .map(({ resource, values }) => [resource, values])

  describe("a change that can't be undone", () => {
    it("clears the redo list and sends clearRedo once, as V2 did, keeping the undo list", async () => {
      await undoableChange(2)
      await undoableChange(3)
      await undo()
      expect([document.canUndo, document.canRedo]).toEqual([true, true])
      broadcastSpy.mockClear()

      await changeThatCantBeUndone(10)
      expect([document.canUndo, document.canRedo]).toEqual([true, false])
      expect(notices("undoChangeNotice")).toEqual([
        ["undoChangeNotice", { operation: "clearRedo", canUndo: true, canRedo: false }]
      ])

      // with nothing left to redo, a burst of such changes sends nothing more
      await changeThatCantBeUndone(11)
      await changeThatCantBeUndone(12)
      expect(notices("undoChangeNotice").length).toBe(1)
    })

    it("leaves the redo list when it doesn't dirty the document, or asks to keep it", async () => {
      await undoableChange(4)
      await undo()
      expect(document.canRedo).toBe(true)
      broadcastSpy.mockClear()
      await changeThatCantBeUndone(20, { noDirty: true })
      await changeThatCantBeUndone(21, { keepRedo: true })
      // a change that doesn't dirty the document, wrapping one made without options
      document.content!.applyModelChange(() => {
        document.content!.applyModelChange(() => global.setValue(22), { suppressWarning: true })
      }, { noDirty: true })
      await historySettled()
      expect(document.canRedo).toBe(true)
      expect(notices("undoChangeNotice")).toEqual([])
    })

    it("isn't made by undo or redo themselves", async () => {
      await undoableChange(5)
      await undoableChange(6)
      await undo()
      await undo()
      expect(document.canRedo).toBe(true)
      await redo()
      expect(document.canRedo).toBe(true)
      await redo()
      expect(global.value).toBe(6)
    })

    describe("followed by an undo or redo before its history entry completes", () => {
      const updateGlobal = (value: number): DIAction =>
        ({ action: "update", resource: `global[${global.name}]`, values: { value } })
      const buttonPress = (operation: string): DIAction =>
        ({ action: "notify", resource: "undoChangeNotice", values: { operation } })
      const redoLevels = () => document.treeManagerAPI!.undoManager.redoLevels

      it("clears the redo list first, so the undo can be redone", async () => {
        await undoableChange(50)
        await undoableChange(51)
        await undo()
        expect(redoLevels()).toBe(1)
        broadcastSpy.mockClear()

        const replies = await processRequest([updateGlobal(52), buttonPress("undoButtonPress")])
        await historySettled()
        expect(replies).toEqual([
          { success: true },
          { success: true, values: { canUndo: true, canRedo: true } }
        ])
        // the redo list holds only the change just undone, as in V2
        expect([document.canRedo, redoLevels()]).toEqual([true, 1])
        expect(notices("undoChangeNotice").map(([, values]) => values.operation)).toEqual(["clearRedo"])
        await redo()
        expect(global.value).toBe(50)
      })

      it("clears the redo list first, so a redo after it has nothing to redo", async () => {
        await undoableChange(53)
        await undo()
        expect(document.canRedo).toBe(true)

        const replies = await processRequest([updateGlobal(54), buttonPress("redoButtonPress")])
        await historySettled()
        expect(replies).toEqual([
          { success: true },
          { success: true, values: { canUndo: true, canRedo: false } }
        ])
        expect(global.value).toBe(54)
      })
    })

    describe("a plugin answering undoAction or redoAction for its own reported action", () => {
      const reportUndoable = async (requester: ProcessActionOptions) => {
        await processAction({
          action: "notify", resource: "undoChangeNotice", values: { operation: "undoableActionPerformed" }
        }, requester)
        await historySettled()
      }
      const updateGlobal = async (requester: ProcessActionOptions, value: number) => {
        await processAction({ action: "update", resource: `global[${global.name}]`, values: { value } }, requester)
        await historySettled()
      }
      afterEach(() => endUndoRedoAnswer())
      // the plugin replies to the undoAction or redoAction notices CODAP sent it, the latest first
      const replyToNotices = (tileId: string, count = 1) => {
        const sent = broadcastSpy.mock.calls.filter(([message, , targetTileId]) =>
          message.resource === "undoChangeNotice" && targetTileId === tileId &&
          ["undoAction", "redoAction"].includes(message.values.operation))
        expect(sent.length).toBeGreaterThanOrEqual(count)
        sent.slice(-count).reverse().forEach(([, callback]) => callback({ success: true }))
      }
      const addWebView = () =>
        document.content!.insertTileSnapshotInDefaultRow({ content: { type: kWebViewTileType } })!

      it("keeps redo while it answers, and not after it has replied", async () => {
        const plugin = { tile: addWebView() }
        const other = { tile: addWebView() }
        await historySettled()
        await reportUndoable(plugin)
        await undo()
        expect(isAnsweringUndoRedo(plugin.tile.id)).toBe(true)

        // the plugin undoes its change through the API, which can't itself be undone, and can still redo it
        await updateGlobal(plugin, 40)
        expect(document.canRedo).toBe(true)
        // another plugin's request isn't part of the answer
        await updateGlobal(other, 41)
        expect(document.canRedo).toBe(false)
      })

      it("ends shortly after the plugin replies", async () => {
        const plugin = { tile: addWebView() }
        await historySettled()
        await reportUndoable(plugin)
        await undo()
        jest.useFakeTimers()
        try {
          replyToNotices(plugin.tile.id)
          jest.advanceTimersByTime(kUndoRedoAnswerGraceMs - 1)
          expect(isAnsweringUndoRedo(plugin.tile.id)).toBe(true)
          jest.advanceTimersByTime(1)
          expect(isAnsweringUndoRedo(plugin.tile.id)).toBe(false)
        } finally {
          jest.useRealTimers()
        }
        await updateGlobal(plugin, 42)
        expect(document.canRedo).toBe(false)
      })

      it("doesn't apply when the plugin wasn't asked: its later requests clear redo", async () => {
        const plugin = { tile: addWebView() }
        await historySettled()
        // the plugin reports an action, the user makes another change and undoes that one
        await reportUndoable(plugin)
        await undoableChange(43)
        await undo()
        expect(isAnsweringUndoRedo(plugin.tile.id)).toBe(false)
        await updateGlobal(plugin, 44)
        expect(document.canRedo).toBe(false)
      })

      it("lasts through a quick double undo, and for two plugins at once", async () => {
        const pluginA = { tile: addWebView() }
        const pluginB = { tile: addWebView() }
        await historySettled()
        // the user changes something, then A and B each report an action
        await undoableChange(47)
        await reportUndoable(pluginA)
        await reportUndoable(pluginB)
        // the user undoes B's, A's and the change in quick succession
        await undo()
        await undo()
        await undo()
        expect(isAnsweringUndoRedo(pluginA.tile.id)).toBe(true)
        expect(isAnsweringUndoRedo(pluginB.tile.id)).toBe(true)
        // replying for one doesn't end the other's answer
        replyToNotices(pluginB.tile.id)
        await updateGlobal(pluginA, 48)
        await updateGlobal(pluginB, 49)
        expect(document.canRedo).toBe(true)
        expect(isAnsweringUndoRedo(pluginA.tile.id)).toBe(true)
      })

      it("applies to the host page, whose requests are identified as kHostPageId", async () => {
        const hostPage = { requesterId: kHostPageId }
        await reportUndoable(hostPage)
        await undo()
        expect(isAnsweringUndoRedo(kHostPageId)).toBe(true)
        await updateGlobal(hostPage, 45)
        expect(document.canRedo).toBe(true)
      })
    })

    it("isn't made by a custom undo or redo that makes its change through applyModelChange", async () => {
      // a custom undo/redo that sets the global without undo strings, as a change that can't be undone would
      registerCustomUndoRedo({ setGlobalValue: {
        undo: (_node, patch) => document.content!.applyModelChange(() => global.setValue(patch.data.from),
          { suppressWarning: true }),
        redo: (_node, patch) => document.content!.applyModelChange(() => global.setValue(patch.data.to),
          { suppressWarning: true })
      } })
      const customChange = async (from: number, to: number) => {
        document.content!.applyModelChange(() => {
          global.setValue(to)
          withCustomUndoRedo({ type: "setGlobalValue", data: { from, to } })
        }, { undoStringKey: "DG.Undo.slider.change", redoStringKey: "DG.Redo.slider.change" })
        await historySettled()
      }
      await customChange(global.value, 50)
      await customChange(50, 51)
      await undo()
      await undo()
      expect(global.value).not.toBe(50)
      expect(document.canRedo).toBe(true)
      await redo()
      expect(global.value).toBe(50)
      expect(document.canRedo).toBe(true)
      await redo()
      expect(global.value).toBe(51)
    })

    it("doesn't come from the plugin requests v2 made without clearing its history, such as deleting items",
        async () => {
      const { dataset } = setupTestDataset({ datasetName: "keepRedoItems" })
      const docData = document.content!.createDataSet(getSnapshot(dataset)).sharedDataSet.dataSet
      docData.validateCases()
      await historySettled()
      const redoable = async () => {
        await undoableChange(46)
        await undo()
        expect(document.canRedo).toBe(true)
      }
      const request = async (action: DIAction) => {
        const result = await processAction(action)
        expect(result.success).toBe(true)
        await historySettled()
      }
      // V2's deleteItems, and setting cases aside and restoring them, kept the undo history
      // (data_context.js:520, :540, :575, :3037-3051)
      await redoable()
      const itemId = toV2Id(docData.itemIds[0])
      await request({ action: "delete", resource: `dataContext[keepRedoItems].itemByID[${itemId}]` })
      expect(document.canRedo).toBe(true)
      const [aCase] = docData.collections[0].caseIds
      await request({ action: "notify", resource: "dataContext[keepRedoItems]",
        values: { request: "setAside", caseIDs: [toV2Id(aCase)] } })
      expect(document.canRedo).toBe(true)
      await request({
        action: "notify", resource: "dataContext[keepRedoItems]", values: { request: "restoreSetasides" }
      })
      expect(document.canRedo).toBe(true)
      // creating items didn't: addItems dirtied the document, erasing the history (data_context.js:1692)
      await request({ action: "create", resource: "dataContext[keepRedoItems].item", values: { a1: "q", a3: 9 } })
      expect(document.canRedo).toBe(false)
      // nor did updating a case (updateCases)
      await redoable()
      const [bCase] = docData.collections[0].caseIds
      await request({ action: "update", resource: `dataContext[keepRedoItems].caseByID[${toV2Id(bCase)}]`,
        values: { values: { a1: "z" } } })
      expect(document.canRedo).toBe(false)
    })

    it("doesn't come from any of the requests on the keep list, nor from one that sets no value", async () => {
      const name = "keepRedoTable"
      const { dataset } = setupTestDataset({ datasetName: name })
      const docData = document.content!.createDataSet(getSnapshot(dataset)).sharedDataSet.dataSet
      docData.validateCases()
      const webView = document.content!.insertTileSnapshotInDefaultRow({ content: { type: kWebViewTileType } })!
      await historySettled()
      const itemId = (index: number) => toV2Id(docData.itemIds[index])
      const caseId = (collectionIndex: number, index = 0) => toV2Id(docData.collections[collectionIndex].caseIds[index])
      const dc = `dataContext[${name}]`
      // [description, request, whether it succeeds]
      const requests: Array<[string, () => DIAction, boolean?]> = [
        ["update caseByID setting no value", () => ({ action: "update",
          resource: `${dc}.collection[collection1].caseByID[${caseId(0)}]`, values: { values: { noSuchAttr: 1 } } }),
          false],
        ["update case setting no value", () => ({ action: "update", resource: `${dc}.collection[collection1].case`,
          values: [{ id: caseId(0), values: {} }] })],
        ["update global to its current value", () => ({ action: "update", resource: `global[${global.name}]`,
          values: { value: global.value } })],
        ["update item", () => ({ action: "update", resource: `${dc}.item`,
          values: [{ id: itemId(0), values: { a3: 10 } }] })],
        ["update itemByID", () => ({ action: "update", resource: `${dc}.itemByID[${itemId(0)}]`,
          values: { a3: 11 } })],
        ["update itemByCaseID", () => ({ action: "update", resource: `${dc}.itemByCaseID[${caseId(2)}]`,
          values: { a3: 12 } })],
        ["notify itemSearch itemOrder", () => ({ action: "notify", resource: `${dc}.itemSearch[a3>0]`,
          values: { itemOrder: "last" } })],
        ["delete itemByCaseID", () => ({ action: "delete", resource: `${dc}.itemByCaseID[${caseId(2)}]` })],
        ["delete itemSearch", () => ({ action: "delete", resource: `${dc}.itemSearch[a3==12]` })],
        ["create case", () => ({ action: "create", resource: `${dc}.collection[collection1].case`,
          values: [{ values: { a1: "c" } }] })],
        ["delete caseByID", () => ({ action: "delete",
          resource: `${dc}.collection[collection1].caseByID[${caseId(0)}]` })],
        ["delete caseByIndex", () => ({ action: "delete", resource: `${dc}.collection[collection1].caseByIndex[0]` })],
        ["delete allCases", () => ({ action: "delete", resource: `${dc}.allCases` })]
      ]
      for (const [description, request, succeeds = true] of requests) {
        await undoableChange(80)
        await undo()
        const { success } = await processAction(request())
        await historySettled()
        expect([description, success, document.canRedo]).toEqual([description, succeeds, true])
      }
      // a plugin's update of its own interactiveFrame
      await undoableChange(81)
      await undo()
      const result = await processAction({ action: "update", resource: "interactiveFrame", values: { title: "Kept" } },
        { tile: webView })
      await historySettled()
      expect([result.success, document.canRedo]).toEqual([true, true])
    })

    it("includes a plugin's request, such as update global", async () => {
      await undoableChange(7)
      await undo()
      broadcastSpy.mockClear()
      const result = await processAction({
        action: "update", resource: `global[${global.name}]`, values: { value: 30 }
      })
      expect(result.success).toBe(true)
      await historySettled()
      expect(document.canRedo).toBe(false)
      expect(notices("undoChangeNotice")).toEqual([
        ["undoChangeNotice", expect.objectContaining({ operation: "clearRedo", canRedo: false })]
      ])
    })
  })

  describe("undoing or redoing a component's creation or deletion", () => {
    const componentNotices = () => notices("component", "document")
      .map(([resource, values]) => resource === "component"
        ? [resource, { operation: values.operation, id: values.id, type: values.type }]
        : [resource, values.operation])

    it("sends the component notice after the document's undo or redo notice", async () => {
      const result = await processAction({ action: "create", resource: "component", values: { type: "text" } })
      expect(result.success).toBe(true)
      await historySettled()
      const id = (result.values as DIComponentInfo).id!
      broadcastSpy.mockClear()

      await undo()
      expect(componentNotices()).toEqual([
        ["document", "undo"], ["component", { operation: "delete", id, type: "text" }]
      ])
      broadcastSpy.mockClear()

      await redo()
      expect(componentNotices()).toEqual([
        ["document", "redo"], ["component", { operation: "create", id, type: "text" }]
      ])
    })

    it("sends create on undoing a deletion and delete on redoing it", async () => {
      const result = await processAction({ action: "create", resource: "component", values: { type: "text" } })
      await historySettled()
      const id = (result.values as DIComponentInfo).id!
      expect((await processAction({ action: "delete", resource: `component[${id}]` })).success).toBe(true)
      await historySettled()
      broadcastSpy.mockClear()

      await undo()
      expect(componentNotices()).toEqual([
        ["document", "undo"], ["component", { operation: "create", id, type: "text" }]
      ])
      broadcastSpy.mockClear()

      await redo()
      expect(componentNotices()).toEqual([
        ["document", "redo"], ["component", { operation: "delete", id, type: "text" }]
      ])
    })

    it("sends the calculator's hide and show when a plugin's create showed it", async () => {
      const result = await processAction({ action: "create", resource: "component", values: { type: "calculator" } })
      expect(result.success).toBe(true)
      await historySettled()
      const id = (result.values as DIComponentInfo).id!
      broadcastSpy.mockClear()
      await undo()
      expect(componentNotices()).toEqual([
        ["document", "undo"], ["component", { operation: "hide", id, type: "calcView" }]
      ])
      broadcastSpy.mockClear()
      await redo()
      expect(componentNotices()).toEqual([
        ["document", "redo"], ["component", { operation: "show", id, type: "calcView" }]
      ])
      await undo()
    })

    it("sends the notices of changes made back to back, each with its own entry", async () => {
      const notice = (operation: string) => ({ message: { action: "notify", resource: "component", values: {
        operation, id: 0, type: "test"
      } } }) as ICoreNotification
      const change = (value: number, name: string) => document.content!.applyModelChange(() => global.setValue(value),
        { undoNotify: notice(`undo ${name}`), undoStringKey: "DG.Undo.slider.change",
          redoStringKey: "DG.Redo.slider.change" })
      change(70, "A")
      change(71, "B")
      await historySettled()
      broadcastSpy.mockClear()
      await undo()
      await undo()
      expect(componentNotices().map(([, values]) => (values)?.operation ?? values))
        .toEqual(["undo", "undo B", "undo", "undo A"])
    })

    it("sends the notices of several changes in one entry, the last change's first on undo", async () => {
      const notice = (operation: string) => ({ message: { action: "notify", resource: "component", values: {
        operation, id: 0, type: "test"
      } } }) as ICoreNotification
      document.content!.applyModelChange(() => {
        document.content!.applyModelChange(() => global.setValue(60),
          { undoNotify: notice("undo first"), redoNotify: notice("redo first"), suppressWarning: true })
        global.setValue(61)
      }, {
        undoNotify: notice("undo second"), redoNotify: notice("redo second"),
        undoStringKey: "DG.Undo.slider.change", redoStringKey: "DG.Redo.slider.change"
      })
      await historySettled()
      broadcastSpy.mockClear()
      await undo()
      expect(componentNotices().map(([, values]) => (values)?.operation ?? values))
        .toEqual(["undo", "undo second", "undo first"])
      broadcastSpy.mockClear()
      await redo()
      expect(componentNotices().map(([, values]) => (values)?.operation ?? values))
        .toEqual(["redo", "redo first", "redo second"])
    })

    it("sends V2's `DG.TableView` create and delete when a closed case table comes back and goes again", async () => {
      const { dataset } = setupTestDataset({ datasetName: "undoRedoTable" })
      document.content!.createDataSet(getSnapshot(dataset))
      const result = await processAction({
        action: "create", resource: "component", values: { type: "caseTable", dataContext: "undoRedoTable" }
      })
      await historySettled()
      const id = (result.values as DIComponentInfo).id!
      expect((await processAction({ action: "delete", resource: `component[${id}]` })).success).toBe(true)
      await historySettled()
      broadcastSpy.mockClear()

      await undo()
      expect(componentNotices()).toEqual([
        ["document", "undo"], ["component", { operation: "create", id, type: "DG.TableView" }]
      ])
      broadcastSpy.mockClear()

      await redo()
      expect(componentNotices()).toEqual([
        ["document", "redo"], ["component", { operation: "delete", id, type: "DG.TableView" }]
      ])
    })
  })
})
