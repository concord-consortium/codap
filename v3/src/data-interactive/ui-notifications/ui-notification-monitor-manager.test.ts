import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiNotice } from "./ui-notification-types"

interface CapturedDelivery {
  targetTileId?: string
  payload: Record<string, unknown>
}

function makeManager() {
  const manager = new UiNotificationMonitorManager()
  const deliveries: CapturedDelivery[] = []
  manager.setDocumentProvider(() => ({
    content: {
      broadcastMessage: (payload, _cb, targetTileId) => {
        deliveries.push({ targetTileId, payload })
      }
    }
  }))
  return { manager, deliveries }
}

function makeClick(targetTestId: string): UiNotice {
  return {
    eventType: "click",
    region: "header",
    target: { testId: targetTestId },
    monitor: { id: -1 }
  }
}

describe("UiNotificationMonitorManager", () => {
  describe("register/update/unregister", () => {
    it("register returns incrementing id and echoes clientId", () => {
      const { manager } = makeManager()
      const r1 = manager.register("owner-1", { eventTypes: ["click"] }, "c1") as
        { ok: true; id: number; clientId?: string }
      const r2 = manager.register("owner-1", { eventTypes: ["appear"] }, "c2") as
        { ok: true; id: number; clientId?: string }
      expect(r1.ok).toBe(true)
      expect(r2.ok).toBe(true)
      expect(r1.id).toBe(1)
      expect(r1.clientId).toBe("c1")
      expect(r2.id).toBe(2)
      expect(r2.clientId).toBe("c2")
    })

    it("register rejects missing ownerTileId", () => {
      const { manager } = makeManager()
      const r = manager.register("", { eventTypes: ["click"] })
      expect(r.ok).toBe(false)
    })

    it("register rejects invalid filter", () => {
      const { manager } = makeManager()
      const r = manager.register("o", { eventTypes: [] })
      expect(r.ok).toBe(false)
    })

    it("update swaps the filter and preserves id/clientId", () => {
      const { manager } = makeManager()
      const r = manager.register("o", { eventTypes: ["click"] }, "cid") as
        { ok: true; id: number; clientId?: string }
      const u = manager.update(r.id, { eventTypes: ["appear"] }) as
        { ok: true; id: number; clientId?: string }
      expect(u.ok).toBe(true)
      expect(u.id).toBe(r.id)
      expect(u.clientId).toBe("cid")
      expect(manager.getMonitor(r.id)?.compiled.eventTypes?.has("appear")).toBe(true)
      expect(manager.getMonitor(r.id)?.compiled.eventTypes?.has("click")).toBe(false)
    })

    it("update with invalid filter preserves existing filter", () => {
      const { manager } = makeManager()
      const r = manager.register("o", { eventTypes: ["click"] }) as { ok: true; id: number }
      const u = manager.update(r.id, { eventTypes: [] })
      expect(u.ok).toBe(false)
      expect(manager.getMonitor(r.id)?.compiled.eventTypes?.has("click")).toBe(true)
    })

    it("update for unknown id errors", () => {
      const { manager } = makeManager()
      const u = manager.update(999, { eventTypes: ["click"] })
      expect(u.ok).toBe(false)
    })

    it("unregister removes monitor and errors on unknown id", () => {
      const { manager } = makeManager()
      const r = manager.register("o", { eventTypes: ["click"] }) as { ok: true; id: number }
      const d = manager.unregister(r.id)
      expect(d.ok).toBe(true)
      const d2 = manager.unregister(r.id)
      expect(d2.ok).toBe(false)
    })
  })

  describe("subscriber-count signal", () => {
    it("fires on 0→1 and 1→0 transitions but not between", () => {
      const { manager } = makeManager()
      const counts: number[] = []
      manager.onSubscriberCountChange(c => counts.push(c))
      const r1 = manager.register("o", { eventTypes: ["click"] }) as { ok: true; id: number }
      const r2 = manager.register("o", { eventTypes: ["appear"] }) as { ok: true; id: number }
      expect(counts).toEqual([1])
      manager.unregister(r1.id)
      expect(counts).toEqual([1])
      manager.unregister(r2.id)
      expect(counts).toEqual([1, 0])
    })
  })

  describe("cancel pending timers", () => {
    it("calls cancel on update and unregister", () => {
      const { manager } = makeManager()
      const cancels: number[] = []
      manager.setCancelPendingTimers(id => cancels.push(id))
      const r = manager.register("o", { eventTypes: ["click"] }) as { ok: true; id: number }
      manager.update(r.id, { eventTypes: ["appear"] })
      manager.unregister(r.id)
      expect(cancels).toEqual([r.id, r.id])
    })
  })

  describe("delivery", () => {
    it("routes only to the owning plugin", () => {
      const { manager, deliveries } = makeManager()
      manager.register("plugin-A", { eventTypes: ["click"] })
      manager.register("plugin-B", { eventTypes: ["click"] })
      manager.deliver(makeClick("foo"))
      const tiles = deliveries.map(d => d.targetTileId)
      expect(tiles.sort()).toEqual(["plugin-A", "plugin-B"])
    })

    it("honors filter match — second plugin's monitor receives no notice that doesn't match", () => {
      const { manager, deliveries } = makeManager()
      manager.register("plugin-A", { eventTypes: ["click"], targets: ["foo"] })
      manager.register("plugin-B", { eventTypes: ["click"], targets: ["bar"] })
      manager.deliver(makeClick("foo"))
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0].targetTileId).toBe("plugin-A")
    })

    it("delivers notices in FIFO order to each monitor", () => {
      const { manager, deliveries } = makeManager()
      manager.register("plugin-A", { eventTypes: ["click"] })
      manager.deliver(makeClick("a"))
      manager.deliver(makeClick("b"))
      manager.deliver(makeClick("c"))
      const order = deliveries.map(d => (d.payload.values as any).target.testId)
      expect(order).toEqual(["a", "b", "c"])
    })

    it("iterates monitors in ascending id order", () => {
      const { manager, deliveries } = makeManager()
      manager.register("plugin-A", { eventTypes: ["click"] })
      manager.register("plugin-B", { eventTypes: ["click"] })
      manager.deliver(makeClick("x"))
      expect(deliveries.map(d => d.targetTileId)).toEqual(["plugin-A", "plugin-B"])
    })

    it("snapshot iteration with mid-batch unregister: unregistered monitor skipped in same batch", () => {
      const { manager: m2 } = makeManager()
      m2.register("A", { eventTypes: ["click"] })
      const rb = m2.register("B", { eventTypes: ["click"] }) as { ok: true; id: number }
      // Monkey-patch the document provider to unregister B during A's delivery
      let calls = 0
      m2.setDocumentProvider(() => ({
        content: {
          broadcastMessage: () => {
            calls++
            if (calls === 1) m2.unregister(rb.id)
          }
        }
      }))
      m2.deliver(makeClick("x"))
      // The snapshot was captured before delivery; after A's broadcast unregisters B, the has() check
      // skips B in the same loop iteration.
      expect(calls).toBe(1)
    })

    it("per-monitor try/catch prevents one monitor error from affecting others", () => {
      const { manager } = makeManager()
      const throwing = jest.fn(() => { throw new Error("boom") })
      // First monitor — throwing broadcast
      manager.setDocumentProvider(() => ({
        content: {
          broadcastMessage: throwing
        }
      }))
      manager.register("A", { eventTypes: ["click"] })
      manager.register("B", { eventTypes: ["click"] })
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)
      expect(() => manager.deliver(makeClick("x"))).not.toThrow()
      expect(throwing).toHaveBeenCalledTimes(2)
      errorSpy.mockRestore()
    })

    it("deliver skips monitors removed mid-iteration", () => {
      const { manager, deliveries } = makeManager()
      manager.register("A", { eventTypes: ["click"] })
      const rb = manager.register("B", { eventTypes: ["click"] }) as { ok: true; id: number }
      manager.unregister(rb.id)
      manager.deliver(makeClick("x"))
      expect(deliveries.map(d => d.targetTileId)).toEqual(["A"])
    })
  })
})
