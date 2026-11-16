import { Instance } from "@concord-consortium/mobx-state-tree"
import { when } from "mobx"
import "../../components/web-view/web-view-registration"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { Logger } from "../../lib/logger"
import { appState } from "../../models/app-state"
import { GlobalValue } from "../../models/global/global-value"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { TreeManager } from "../../models/history/tree-manager"
import { ITileModel } from "../../models/tiles/tile-model"
import { diUndoChangeNoticeHandler } from "./undo-change-notice-handler"

// Wait for the history entry to be fully processed
async function waitForHistoryEntry() {
  const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
  await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
}

describe("DataInteractive UndoChangeNoticeHandler", () => {
  const handler = diUndoChangeNoticeHandler

  it("returns error when interactiveFrame is missing", async () => {
    const result = await handler.notify?.({}, { operation: "undoableActionPerformed" })
    expect(result?.success).toBe(false)
  })

  it("returns error for unknown operation", async () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const result = await handler.notify?.({ interactiveFrame: tile }, { operation: "bogus" })
    expect(result?.success).toBe(false)
  })

  it("returns error when operation is missing", async () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const result = await handler.notify?.({ interactiveFrame: tile }, {})
    expect(result?.success).toBe(false)
  })

  describe("with undo monitoring enabled", () => {
    let tile: ITileModel

    beforeEach(() => {
      tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      appState.document.treeMonitor!.enableMonitoring()
    })

    afterEach(() => {
      appState.document.treeMonitor!.disableMonitoring()
    })

    it("undoableActionPerformed creates an undo entry and returns success", async () => {
      const result = await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      expect(result?.success).toBe(true)
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)
    })

    it("undoButtonPress returns success", async () => {
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()

      const result = await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      expect(result?.success).toBe(true)
      await waitForHistoryEntry()
      expect(appState.document.canRedo).toBe(true)
    })

    it("redoButtonPress returns success", async () => {
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()

      const result = await handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      expect(result?.success).toBe(true)
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)
    })

    it("undoButtonPress succeeds when nothing to undo", async () => {
      const result = await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      expect(result?.success).toBe(true)
    })

    it("redoButtonPress succeeds when nothing to redo", async () => {
      const result = await handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      expect(result?.success).toBe(true)
    })

    it("undo then redo round-trips correctly", async () => {
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)

      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()
      expect(appState.document.canRedo).toBe(true)

      await handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)
    })

    it("undo sends undoAction message to the originating plugin", async () => {
      const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")

      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()

      broadcastSpy.mockClear()
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()

      const undoCall = broadcastSpy.mock.calls.find(
        ([msg]) => msg.resource === "undoChangeNotice" && msg.values?.operation === "undoAction"
      )
      expect(undoCall).toBeDefined()
      // Should target only the originating plugin tile
      expect(undoCall?.[2]).toBe(tile.id)

      broadcastSpy.mockRestore()
    })

    it("redo sends redoAction message to the originating plugin", async () => {
      const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")

      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()

      broadcastSpy.mockClear()
      await handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      await waitForHistoryEntry()

      const redoCall = broadcastSpy.mock.calls.find(
        ([msg]) => msg.resource === "undoChangeNotice" && msg.values?.operation === "redoAction"
      )
      expect(redoCall).toBeDefined()
      expect(redoCall?.[2]).toBe(tile.id)

      broadcastSpy.mockRestore()
    })

  })

  describe("v2's undo history notices", () => {
    let tile: ITileModel
    let broadcastSpy: jest.SpyInstance
    let loggerSpy: jest.SpyInstance
    let alertSpy: jest.SpyInstance

    beforeEach(() => {
      tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
      appState.document.treeMonitor!.enableMonitoring()
      broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
      loggerSpy = jest.spyOn(Logger, "log").mockImplementation(() => null)
      alertSpy = jest.spyOn(appState, "alert").mockImplementation(() => null)
    })

    afterEach(() => {
      broadcastSpy.mockRestore()
      loggerSpy.mockRestore()
      alertSpy.mockRestore()
      appState.document.treeMonitor!.disableMonitoring()
    })

    const notices = (resource: string) => broadcastSpy.mock.calls
      .map(([message, , targetTileId, excludeTileId]) => ({ message, targetTileId, excludeTileId }))
      .filter(({ message }) => message.resource === resource)

    it("replies to undoableActionPerformed with the history after the action", async () => {
      while (appState.document.canUndo) {
        appState.document.undoLastAction()
        await waitForHistoryEntry()
      }
      const result = await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      expect(result?.values).toEqual({ canUndo: true, canRedo: false })
    })

    it("sends clearRedo to every plugin for each undoable action, even with nothing to redo", async () => {
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      const clearRedo = notices("undoChangeNotice")
        .filter(({ message }) => message.values.operation === "clearRedo")
      expect(clearRedo).toHaveLength(2)
      clearRedo.forEach(({ message, targetTileId, excludeTileId }) => {
        expect(message.values).toEqual({ operation: "clearRedo", canUndo: true, canRedo: false })
        expect(targetTileId).toBeUndefined()
        expect(excludeTileId).toBeUndefined()
      })
    })

    it("sends undo and redo on document, and no clear notices, when undoing and redoing", async () => {
      while (appState.document.canUndo) {
        appState.document.undoLastAction()
        await waitForHistoryEntry()
      }
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      broadcastSpy.mockClear()

      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()
      await handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      await waitForHistoryEntry()

      expect(notices("document").map(({ message, targetTileId, excludeTileId }) =>
        [message.values, targetTileId, excludeTileId])).toEqual([
        [{ operation: "undo", canUndo: false, canRedo: true }, undefined, undefined],
        [{ operation: "redo", canUndo: true, canRedo: false }, undefined, undefined]
      ])
      const clearNotices = notices("undoChangeNotice")
        .filter(({ message }) => ["clearUndo", "clearRedo"].includes(message.values.operation))
      expect(clearNotices).toEqual([])
    })

    it("logs the plugin's logMessage, as v2 did", async () => {
      await handler.notify?.({ interactiveFrame: tile },
        { operation: "undoableActionPerformed", logMessage: "moved the slider" })
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed", logMessage: "" })
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      const messages = loggerSpy.mock.calls.map(([message]) => message)
      expect(messages).toContain("Interactive action occurred: moved the slider")
      // an empty or missing logMessage is logged as "Unknown action", as in v2
      expect(messages.filter(message => message === "Interactive action occurred: Unknown action")).toHaveLength(2)
    })

    it("alerts the user when the plugin fails to undo or redo", async () => {
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      broadcastSpy.mockImplementation((message: any, callback: (response: any) => void) => {
        if (message.values?.operation === "undoAction" || message.values?.operation === "redoAction") {
          callback({ success: false })
        }
      })
      await jestSpyConsole("warn", async () => {
        await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
        await waitForHistoryEntry()
        await handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
        await waitForHistoryEntry()
      })
      await waitForHistoryEntry()
      expect(alertSpy.mock.calls.map(([message]) => message)).toEqual([
        "An error occurred while trying to undo.", "An error occurred while trying to redo."
      ])
    })

    it("treats a reply without success: false as success, as v2 did", async () => {
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      broadcastSpy.mockImplementation((message: any, callback: (response: any) => void) => {
        if (message.values?.operation === "undoAction") callback({})
      })
      await handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()
      expect(alertSpy).not.toHaveBeenCalled()
    })

    it("sends undo and redo on document after the notices of the change being undone, as v2 did", async () => {
      const manager = appState.document.content!.getFirstSharedModelByType(GlobalValueManager)!
      const global = GlobalValue.create({ name: "undoOrder", value: 1 })
      manager.addValue(global)
      appState.document.content!.applyModelChange(() => global.setValue(2),
        { undoStringKey: "DG.Undo.slider.change", redoStringKey: "DG.Redo.slider.change" })
      await waitForHistoryEntry()
      broadcastSpy.mockClear()

      appState.document.undoLastAction()
      await waitForHistoryEntry()
      appState.document.redoLastAction()
      await waitForHistoryEntry()

      const order = broadcastSpy.mock.calls.map(([message]) => message)
        .filter(message => message.resource === "global[undoOrder]" || message.resource === "document")
        .map(message => message.values.operation ?? message.values.globalValue)
      expect(order).toEqual([1, "undo", 2, "redo"])
    })
  })
})
