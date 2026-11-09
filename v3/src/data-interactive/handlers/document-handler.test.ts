import fs from "fs"
import { Instance } from "mobx-state-tree"
import { when } from "mobx"
import path from "path"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { appState } from "../../models/app-state"
import { GlobalValue } from "../../models/global/global-value"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { TreeManager } from "../../models/history/tree-manager"
import "../../register-tile-types"
import { processAction, ProcessActionOptions } from "../data-interactive-request-processor"

describe("update document", () => {
  let broadcastSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
  })

  afterEach(() => {
    broadcastSpy.mockRestore()
    jest.useRealTimers()
  })

  // the documentChangeNotice broadcasts, with the tile each was targeted at (undefined = every plugin)
  const documentNotices = () => broadcastSpy.mock.calls
    .filter(([message]) => message.resource === "documentChangeNotice")
    .map(([message, , targetTileId]) => ({ values: message.values, targetTileId }))

  const update = (values: any, options?: ProcessActionOptions) =>
    processAction({ action: "update", resource: "document", values }, options)

  const readV2Document = (fileName: string) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, "../../test/v2", fileName), "utf8"))

  it("sends updateDocumentBegun, replies, then sends updateDocumentEnded 500 ms later to every plugin, " +
    "the requester included", async () => {
    const v2Document = readV2Document("game-view-microdata.codap")
    expect((await update(v2Document)).success).toBe(true)
    jest.runAllTimers()
    const { content } = appState.document
    const tile = Array.from(content!.tileMap.values()).find(({ content: { type } }) => type === kWebViewTileType)!
    const requesterSpy = jest.spyOn(tile.content, "broadcastMessage")
    broadcastSpy.mockClear()

    const result = await update(v2Document, { tile })
    expect(result.success).toBe(true)
    expect(documentNotices()).toEqual([
      { values: { operation: "updateDocumentBegun" }, targetTileId: undefined }
    ])

    jest.advanceTimersByTime(499)
    expect(documentNotices()).toHaveLength(1)
    jest.advanceTimersByTime(1)
    expect(documentNotices()).toEqual([
      { values: { operation: "updateDocumentBegun" }, targetTileId: undefined },
      { values: { operation: "updateDocumentEnded", success: true }, targetTileId: undefined }
    ])
    expect(requesterSpy.mock.calls.map(([message]) => message)
      .filter(({ resource }) => resource === "documentChangeNotice").map(({ values }) => values)).toEqual([
      { operation: "updateDocumentBegun" }, { operation: "updateDocumentEnded", success: true }
    ])
    requesterSpy.mockRestore()
  })

  it("sends updateDocumentEnded with success: false, and replies with an error, when the update fails", async () => {
    const result = await update({ name: "malformed", components: [], contexts: "not a list" })
    expect(result.success).toBe(false)
    expect(documentNotices()).toEqual([
      { values: { operation: "updateDocumentBegun" }, targetTileId: undefined },
      { values: { operation: "updateDocumentEnded", success: false }, targetTileId: undefined }
    ])
  })

  it("requires values, and then sends nothing", async () => {
    expect((await update(undefined)).success).toBe(false)
    expect(documentNotices()).toEqual([])
  })

  const sliderDocument = (value: number) => {
    const v2Document = readV2Document("slider.codap")
    v2Document.globalValues[0].value = value
    return v2Document
  }

  // the documentChangeNotice and global[<name>] broadcasts, in order, for an update and its updateDocumentEnded
  async function updateNotices(values: any) {
    broadcastSpy.mockClear()
    expect((await update(values)).success).toBe(true)
    jest.advanceTimersByTime(500)
    return broadcastSpy.mock.calls
      .map(([message]) => message)
      .filter(({ resource }) => resource === "documentChangeNotice" || resource.startsWith("global["))
      .map(({ resource, values: _values }) => ({ resource, values: _values }))
  }

  it("sends global[<name>] when it changes an existing global's value, as in V2", async () => {
    await updateNotices(sliderDocument(3))

    expect(await updateNotices(sliderDocument(5))).toEqual([
      { resource: "documentChangeNotice", values: { operation: "updateDocumentBegun" } },
      { resource: "global[mine]", values: { globalValue: 5 } },
      { resource: "documentChangeNotice", values: { operation: "updateDocumentEnded", success: true } }
    ])

    // an update that leaves the value unchanged sends no global[<name>]
    expect(await updateNotices(sliderDocument(5))).toEqual([
      { resource: "documentChangeNotice", values: { operation: "updateDocumentBegun" } },
      { resource: "documentChangeNotice", values: { operation: "updateDocumentEnded", success: true } }
    ])
  })
})

describe("update document and the undo history", () => {
  const { document } = appState
  let broadcastSpy: jest.SpyInstance

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

  it("erases the history, sending clearUndo then clearRedo, just before updateDocumentEnded, as in V2", async () => {
    const manager = document.content!.getFirstSharedModelByType(GlobalValueManager)!
    const global = GlobalValue.create({ name: "historyTest", value: 1 })
    manager.addValue(global)
    const undoableChange = async (value: number) => {
      document.content!.applyModelChange(() => global.setValue(value),
        { undoStringKey: "DG.Undo.slider.change", redoStringKey: "DG.Redo.slider.change" })
      await historySettled()
    }
    await undoableChange(2)
    await undoableChange(3)
    document.undoLastAction()
    await historySettled()
    expect([document.canUndo, document.canRedo]).toEqual([true, true])
    broadcastSpy.mockClear()

    const v2Document = JSON.parse(fs.readFileSync(path.join(__dirname, "../../test/v2/mammals.codap"), "utf8"))
    expect((await processAction({ action: "update", resource: "document", values: v2Document })).success).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 600))

    expect([document.canUndo, document.canRedo]).toEqual([false, false])
    const notices = broadcastSpy.mock.calls.map(([message]) => message)
      .filter(({ resource }) => resource === "undoChangeNotice" || resource === "documentChangeNotice")
      .map(({ values }) => values)
    expect(notices.slice(-3)).toEqual([
      { operation: "clearUndo", canUndo: false, canRedo: false },
      { operation: "clearRedo", canUndo: false, canRedo: false },
      { operation: "updateDocumentEnded", success: true }
    ])
  })
})
