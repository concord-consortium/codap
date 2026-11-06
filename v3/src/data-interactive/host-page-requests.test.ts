import { Instance } from "@concord-consortium/mobx-state-tree"
import { when } from "mobx"
import "../components/web-view/web-view-registration"
import { kWebViewTileType } from "../components/web-view/web-view-defs"
import {
  IEmbeddedModeHandler, kHostPageId, registerEmbeddedModeHandler
} from "../lib/embedded-mode/embedded-mode-registry"
import { Logger } from "../lib/logger"
import { appState } from "../models/app-state"
import { TreeManager } from "../models/history/tree-manager"
import { ITileModel } from "../models/tiles/tile-model"
import { processAction } from "./data-interactive-request-processor"
import { DIAction, DISuccessResult } from "./data-interactive-types"
import { logMonitorManager } from "./log-monitor-manager"
import "./register-handlers"

// requests from the page CODAP is embedded in arrive with no tile, as from the embedded server
function hostRequest(action: DIAction) {
  return processAction(action) as Promise<DISuccessResult>
}

async function waitForHistoryEntry() {
  const manager = appState.document.treeManagerAPI as Instance<typeof TreeManager>
  await when(() => manager.activeHistoryEntries.length === 0, { timeout: 500 })
}

describe("requests from the host page", () => {
  const content = appState.document.content!
  let hostPage: IEmbeddedModeHandler & { broadcastMessage: jest.Mock }
  let plugin: ITileModel
  let pluginSpy: jest.SpyInstance

  // the messages each recipient received with the given resource
  function received(spy: jest.Mock | jest.SpyInstance, resource: string) {
    return spy.mock.calls.map(([message]) => message).filter(message => message.resource === resource)
  }

  beforeEach(() => {
    hostPage = { isPhoneInUse: true, broadcastMessage: jest.fn() }
    registerEmbeddedModeHandler(hostPage)
    plugin = content.createOrShowTile(kWebViewTileType)!
    pluginSpy = jest.spyOn(plugin.content, "broadcastMessage")
  })

  afterEach(() => {
    pluginSpy.mockRestore()
    registerEmbeddedModeHandler(null)
    logMonitorManager.unregisterAll()
  })

  describe("undoChangeNotice", () => {
    beforeEach(() => {
      appState.document.treeMonitor!.enableMonitoring()
    })

    afterEach(() => {
      appState.document.treeMonitor!.disableMonitoring()
    })

    it("puts the host page's action on the history and sends its undoAction and redoAction to it", async () => {
      const notify = (operation: string) =>
        hostRequest({ action: "notify", resource: "undoChangeNotice", values: { operation } })

      const performed = await notify("undoableActionPerformed")
      expect(performed.success).toBe(true)
      await waitForHistoryEntry()
      expect(appState.document.canUndo).toBe(true)

      const undone = await notify("undoButtonPress")
      expect(undone.success).toBe(true)
      expect(undone.values).toEqual({ canUndo: expect.any(Boolean), canRedo: true })
      await waitForHistoryEntry()
      expect(received(hostPage.broadcastMessage, "undoChangeNotice").map(m => m.values.operation))
        .toContain("undoAction")

      const redone = await notify("redoButtonPress")
      expect(redone.success).toBe(true)
      await waitForHistoryEntry()
      expect(received(hostPage.broadcastMessage, "undoChangeNotice").map(m => m.values.operation))
        .toContain("redoAction")

      // the plugin is not told to undo or redo the host page's action
      const pluginOperations = received(pluginSpy, "undoChangeNotice").map(m => m.values.operation)
      expect(pluginOperations).not.toContain("undoAction")
      expect(pluginOperations).not.toContain("redoAction")
    })
  })

  describe("configuration and configurationList", () => {
    afterEach(() => {
      content.setGaussianFitEnabled(false)
    })

    it("answers the host page as it answers a plugin", async () => {
      const updated = await hostRequest({
        action: "update", resource: "configuration[gaussianFitEnabled]", values: { value: "yes" }
      })
      expect(updated.success).toBe(true)
      expect(content.gaussianFitEnabled).toBe(true)

      const got = await hostRequest({ action: "get", resource: "configuration[gaussianFitEnabled]" })
      expect(got).toEqual({ success: true, values: { name: "gaussianFitEnabled", value: "yes" } })

      const list = await hostRequest({ action: "get", resource: "configurationList" })
      expect(list).toEqual({ success: true, values: [{ name: "gaussianFitEnabled", value: "yes" }] })
    })
  })

  describe("logMessageMonitor and logMessage", () => {
    it("registers the host page's monitor and sends its notices to the host page alone", async () => {
      const registered = await hostRequest({
        action: "register", resource: "logMessageMonitor", values: { topic: "host.topic" }
      })
      expect(registered.success).toBe(true)
      expect(registered.values).toEqual({ logMonitor: { id: expect.any(Number), clientId: kHostPageId } })

      await hostRequest({ action: "notify", resource: "logMessage", values: { formatStr: "hi", topic: "host.topic" } })
      const notices = received(hostPage.broadcastMessage, "logMessageNotice")
      expect(notices).toHaveLength(1)
      expect(notices[0].values).toMatchObject({ message: "hi", topic: "host.topic" })
      expect(received(pluginSpy, "logMessageNotice")).toHaveLength(0)
    })

    it("logs a message from the host page", async () => {
      const logSpy = jest.spyOn(Logger, "log").mockImplementation(() => null)
      const result = await hostRequest({
        action: "notify", resource: "logMessage", values: { formatStr: "Host page did %@", replaceArgs: ["this"] }
      })
      expect(result.success).toBe(true)
      expect(logSpy).toHaveBeenCalledWith("Host page did this", { 0: "this" }, undefined)
      logSpy.mockRestore()
    })
  })

  it("a broadcast targeted at the host page reaches no plugin", () => {
    const message = { action: "notify", resource: "test", values: {} }
    content.broadcastMessage(message, () => null, kHostPageId)
    expect(hostPage.broadcastMessage).toHaveBeenCalledWith(message, expect.any(Function))
    expect(pluginSpy).not.toHaveBeenCalled()
  })
})
