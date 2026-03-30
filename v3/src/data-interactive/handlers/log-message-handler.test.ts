import "../../components/web-view/web-view-registration"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { DILogMessage, DIResources, DIValues } from "../data-interactive-types"
import { diLogMessageHandler } from "./log-message-handler"
import { diLogMessageMonitorHandler } from "./log-message-monitor-handler"
import { logMonitorManager } from "../log-monitor-manager"
import { appState } from "../../models/app-state"
import { IWebViewModel } from "../../components/web-view/web-view-model"

describe("DataInteractive LogMessageHandler", () => {
  const handler = diLogMessageHandler
  const notify = handler.notify!

  it("notify works", () => {
    const interactiveFrame = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const resources: DIResources = { interactiveFrame }
    const values: DIValues = { formatStr: "Hello, World!" }
    expect(notify(resources, values).success).toBe(true)
  })

  it('should send the log message to the model', () => {
    expect(notify({}).success).toBe(false)
    const interactiveFrame = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const webViewContent = interactiveFrame.content as IWebViewModel
    webViewContent.applyModelChange = jest.fn()
    const resources: DIResources = { interactiveFrame }
    const values: DIValues = {
      formatStr: "This is a log message with %@",
      replaceArgs: ["replacement"]
    } as DILogMessage

    notify(resources, values)
    expect(webViewContent.applyModelChange).toHaveBeenCalled()
    expect(webViewContent.applyModelChange).toHaveBeenCalledWith(expect.any(Function), {
      noDirty: true, log: {message: "This is a log message with replacement", args: {0: "replacement"}}
    })
  })

  it("passes topic to log monitor evaluation", () => {
    const interactiveFrame = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const resources: DIResources = { interactiveFrame }
    const values: DIValues = {
      formatStr: "game event: %@",
      replaceArgs: ["start"],
      topic: "game.lifecycle"
    } as DILogMessage

    logMonitorManager.unregisterAll()
    const evaluateSpy = jest.spyOn(logMonitorManager, "evaluateLogEvent")

    notify(resources, values)

    expect(evaluateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "game.lifecycle" })
    )
    evaluateSpy.mockRestore()
  })
})

describe("DataInteractive LogMessageMonitorHandler", () => {
  const handler = diLogMessageMonitorHandler

  beforeEach(() => {
    logMonitorManager.unregisterAll()
  })

  it("registers a monitor with valid filter", () => {
    const resources = { interactiveFrame: { id: "plugin-1" } } as any
    const values = { message: "*" } as any
    const result = handler.register!(resources, values)
    expect(result.success).toBe(true)
    expect((result as any).values.logMonitor.id).toBeDefined()
    expect((result as any).values.logMonitor.clientId).toBe("plugin-1")
  })

  it("returns error when no clientId available", () => {
    const resources = {} as any
    const values = { message: "*" } as any
    const result = handler.register!(resources, values)
    expect(result.success).toBe(false)
  })

  it("returns error when no values provided", () => {
    const resources = { interactiveFrame: { id: "plugin-1" } } as any
    const result = handler.register!(resources)
    expect(result.success).toBe(false)
  })

  it("unregisters by monitor ID", () => {
    const resources = { interactiveFrame: { id: "plugin-1" } } as any
    const registerResult = handler.register!(resources, { message: "*" } as any)
    const monitorId = (registerResult as any).values.logMonitor.id

    const result = handler.unregister!(resources, { id: monitorId } as any)
    expect(result.success).toBe(true)
  })

  it("unregisters by clientId", () => {
    const resources = { interactiveFrame: { id: "plugin-1" } } as any
    handler.register!(resources, { message: "*" } as any)

    const result = handler.unregister!(resources, { clientId: "plugin-1" } as any)
    expect(result.success).toBe(true)
  })

  it("returns failure for unregister with invalid ID", () => {
    const resources = {} as any
    const result = handler.unregister!(resources, { id: 9999 } as any)
    expect(result.success).toBe(false)
  })
})
