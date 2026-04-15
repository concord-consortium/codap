import { uiNotificationMonitorManager } from "../ui-notifications/ui-notification-monitor-manager"
import { diUiNotificationMonitorHandler } from "./ui-notification-monitor-handler"

describe("DataInteractive UiNotificationMonitorHandler", () => {
  const handler = diUiNotificationMonitorHandler
  const fakeFrame = { id: "WEBV-1" }

  beforeEach(() => {
    uiNotificationMonitorManager.unregisterAll()
  })

  it("notify without interactiveFrame returns error", () => {
    const result = handler.notify?.({}, { eventTypes: ["click"] })
    expect(result?.success).toBe(false)
  })

  it("notify without values returns valuesRequired error", () => {
    const result = handler.notify?.({ interactiveFrame: fakeFrame as any })
    expect(result?.success).toBe(false)
  })

  it("notify with malformed filter returns error", () => {
    const result = handler.notify?.({ interactiveFrame: fakeFrame as any }, { eventTypes: [] } as any)
    expect(result?.success).toBe(false)
  })

  it("notify returns id and echoed clientId", () => {
    const r = handler.notify?.(
      { interactiveFrame: fakeFrame as any },
      { eventTypes: ["click"], clientId: "my-client" } as any
    )
    expect(r?.success).toBe(true)
    const values = r?.values as { id: number; clientId?: string }
    expect(values.id).toBeGreaterThan(0)
    expect(values.clientId).toBe("my-client")
  })

  it("update with unknown id returns error", () => {
    const r = handler.update?.(
      { interactiveFrame: fakeFrame as any, uiNotificationMonitor: "9999" },
      { eventTypes: ["click"] } as any
    )
    expect(r?.success).toBe(false)
  })

  it("update with existing id swaps filter", () => {
    const created = handler.notify?.(
      { interactiveFrame: fakeFrame as any },
      { eventTypes: ["click"] } as any
    )
    const id = (created?.values as { id: number }).id
    const r = handler.update?.(
      { interactiveFrame: fakeFrame as any, uiNotificationMonitor: String(id) },
      { eventTypes: ["appear"] } as any
    )
    expect(r?.success).toBe(true)
  })

  it("delete with unknown id returns error", () => {
    const r = handler.delete?.(
      { interactiveFrame: fakeFrame as any, uiNotificationMonitor: "9999" }
    )
    expect(r?.success).toBe(false)
  })

  it("delete with existing id succeeds", () => {
    const created = handler.notify?.(
      { interactiveFrame: fakeFrame as any },
      { eventTypes: ["click"] } as any
    )
    const id = (created?.values as { id: number }).id
    const r = handler.delete?.(
      { interactiveFrame: fakeFrame as any, uiNotificationMonitor: String(id) }
    )
    expect(r?.success).toBe(true)
  })
})
