import { Instance } from "@concord-consortium/mobx-state-tree"
import { when } from "mobx"
import "../../components/web-view/web-view-registration"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { appState } from "../../models/app-state"
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

  it("returns error when interactiveFrame is missing", () => {
    const result = handler.notify?.({}, { operation: "undoableActionPerformed" })
    expect(result?.success).toBe(false)
  })

  it("returns error for unknown operation", () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const result = handler.notify?.({ interactiveFrame: tile }, { operation: "bogus" })
    expect(result?.success).toBe(false)
  })

  it("returns error when operation is missing", () => {
    const tile = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const result = handler.notify?.({ interactiveFrame: tile }, {})
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
      const result = handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      expect(result?.success).toBe(true)
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)
    })

    it("undoButtonPress returns success", async () => {
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()

      const result = handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      expect(result?.success).toBe(true)
      await waitForHistoryEntry()
      expect(appState.document.canRedo).toBe(true)
    })

    it("redoButtonPress returns success", async () => {
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()

      const result = handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      expect(result?.success).toBe(true)
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)
    })

    it("undoButtonPress succeeds when nothing to undo", () => {
      const result = handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      expect(result?.success).toBe(true)
    })

    it("redoButtonPress succeeds when nothing to redo", () => {
      const result = handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      expect(result?.success).toBe(true)
    })

    it("undo then redo round-trips correctly", async () => {
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)

      handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()
      expect(appState.document.canRedo).toBe(true)

      handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)
    })

    it("undo sends undoAction message to the originating plugin", async () => {
      const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")

      handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()

      broadcastSpy.mockClear()
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
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

      handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()

      broadcastSpy.mockClear()
      handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      await waitForHistoryEntry()

      const redoCall = broadcastSpy.mock.calls.find(
        ([msg]) => msg.resource === "undoChangeNotice" && msg.values?.operation === "redoAction"
      )
      expect(redoCall).toBeDefined()
      expect(redoCall?.[2]).toBe(tile.id)

      broadcastSpy.mockRestore()
    })

    it("proactive clearUndo notification is broadcast when undo stack is emptied", async () => {
      const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")

      // Undo all existing entries to start with an empty undo stack
      while (appState.document.canUndo) {
        appState.document.undoLastAction()
        await waitForHistoryEntry()
      }
      expect(appState.document.canUndo).toBe(false)

      // Create an entry, then undo it to empty the stack
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)

      broadcastSpy.mockClear()
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()

      // Wait for the MobX reaction to fire
      await new Promise(resolve => setTimeout(resolve, 10))

      const clearUndoCall = broadcastSpy.mock.calls.find(
        ([msg]) => msg.resource === "undoChangeNotice" && msg.values?.operation === "clearUndo"
      )
      expect(clearUndoCall).toBeDefined()
      const values = clearUndoCall?.[0].values
      expect(values.canUndo).toBe(false)
      // clearUndo is broadcast to all plugins (no targetTileId)
      expect(clearUndoCall?.[2]).toBeUndefined()

      broadcastSpy.mockRestore()
    })

    it("proactive clearRedo notification is broadcast when redo stack is emptied", async () => {
      const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")

      // Create entry, undo it, then redo to empty the redo stack
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoableActionPerformed" })
      await waitForHistoryEntry()
      handler.notify?.({ interactiveFrame: tile }, { operation: "undoButtonPress" })
      await waitForHistoryEntry()
      expect(appState.document.canRedo).toBe(true)

      broadcastSpy.mockClear()
      handler.notify?.({ interactiveFrame: tile }, { operation: "redoButtonPress" })
      await waitForHistoryEntry()

      // Wait for the MobX reaction to fire
      await new Promise(resolve => setTimeout(resolve, 10))

      const clearRedoCall = broadcastSpy.mock.calls.find(
        ([msg]) => msg.resource === "undoChangeNotice" && msg.values?.operation === "clearRedo"
      )
      expect(clearRedoCall).toBeDefined()
      const values = clearRedoCall?.[0].values
      expect(values.canUndo).toBe(true)
      expect(values.canRedo).toBe(false)
      // clearRedo is broadcast to all plugins (no targetTileId)
      expect(clearRedoCall?.[2]).toBeUndefined()

      broadcastSpy.mockRestore()
    })
  })
})
