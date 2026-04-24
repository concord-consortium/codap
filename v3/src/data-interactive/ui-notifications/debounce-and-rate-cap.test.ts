import {
  createDeliveryPipeline, DEFAULT_DEBOUNCE_MS, DEFAULT_RATE_CAP, RATE_CAP_WINDOW_MS, targetKeyFor
} from "./debounce-and-rate-cap"
import { UiMonitor, UiNotice } from "./ui-notification-types"

function monitor(id: number): UiMonitor {
  return {
    id,
    ownerTileId: `plugin-${id}`,
    filter: {},
    compiled: {}
  }
}

function appear(testId = "x"): UiNotice {
  return {
    eventType: "appear",
    region: "header",
    target: { testId },
    monitor: { id: 0 }
  } as UiNotice
}

function click(testId = "x"): UiNotice {
  return {
    eventType: "click",
    region: "header",
    target: { testId },
    monitor: { id: 0 }
  } as UiNotice
}

describe("createDeliveryPipeline", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("delivers a one-shot appear exactly once (no trailing)", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((_m, n) => delivered.push(n))
    const m = monitor(1)
    p.enqueue(m, appear("foo"))
    expect(delivered).toHaveLength(1) // leading
    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 1)
    expect(delivered).toHaveLength(1) // no trailing because no additional
  })

  it("delivers a multi-mutation burst as leading + trailing (exactly 2)", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((_m, n) => delivered.push(n))
    const m = monitor(1)
    p.enqueue(m, appear("foo"))
    p.enqueue(m, appear("foo"))
    p.enqueue(m, appear("foo"))
    expect(delivered).toHaveLength(1) // leading
    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 1)
    expect(delivered).toHaveLength(2) // + trailing
  })

  it("bypasses debounce for click/dblclick/drag events", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((_m, n) => delivered.push(n))
    const m = monitor(1)
    p.enqueue(m, click("a"))
    p.enqueue(m, click("a"))
    p.enqueue(m, click("a"))
    expect(delivered).toHaveLength(3)
  })

  it("rate cap drops the (cap+1)-th notice and emits one rateLimited", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((_m, n) => delivered.push(n))
    const m = monitor(1)
    for (let i = 0; i < DEFAULT_RATE_CAP; i++) p.enqueue(m, click(`i-${i}`))
    expect(delivered.filter(d => d.eventType === "click")).toHaveLength(DEFAULT_RATE_CAP)
    p.enqueue(m, click("over"))
    const rl = delivered.filter(d => d.eventType === "rateLimited")
    expect(rl).toHaveLength(1)
    expect(delivered.filter(d => d.eventType === "click")).toHaveLength(DEFAULT_RATE_CAP)
  })

  it("rateLimited counter doesn't feed itself", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((_m, n) => delivered.push(n))
    const m = monitor(1)
    for (let i = 0; i < DEFAULT_RATE_CAP + 5; i++) p.enqueue(m, click(`i-${i}`))
    const rl = delivered.filter(d => d.eventType === "rateLimited")
    expect(rl).toHaveLength(1) // only one within the window
  })

  it("per-monitor isolation: one monitor's rate cap doesn't affect another", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((m, n) => delivered.push({ ...n, monitor: { id: m.id } }))
    const a = monitor(1)
    const b = monitor(2)
    for (let i = 0; i < DEFAULT_RATE_CAP; i++) p.enqueue(a, click(`a-${i}`))
    // b should still be able to receive freely
    for (let i = 0; i < 10; i++) p.enqueue(b, click(`b-${i}`))
    const bClicks = delivered.filter(d => d.eventType === "click" && d.monitor?.id === 2)
    expect(bClicks).toHaveLength(10)
  })

  it("cancelMonitor drops pending trailing and resets state", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((_m, n) => delivered.push(n))
    const m = monitor(1)
    p.enqueue(m, appear("a"))
    p.enqueue(m, appear("a"))
    expect(delivered).toHaveLength(1) // leading
    p.cancelMonitor(m.id)
    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 1)
    expect(delivered).toHaveLength(1) // no trailing after cancel
  })

  it("rate cap resets after window elapses", () => {
    let now = 1000
    const p = createDeliveryPipeline(() => { /* no-op */ }, { nowMs: () => now })
    const delivered: UiNotice[] = []
    const p2 = createDeliveryPipeline((_m, n) => delivered.push(n), { nowMs: () => now })
    const m = monitor(1)
    for (let i = 0; i < DEFAULT_RATE_CAP; i++) p2.enqueue(m, click(`i-${i}`))
    expect(delivered.filter(d => d.eventType === "click")).toHaveLength(DEFAULT_RATE_CAP)
    // Advance virtual time past window
    now += RATE_CAP_WINDOW_MS + 100
    p2.enqueue(m, click("fresh"))
    expect(delivered.filter(d => d.eventType === "click")).toHaveLength(DEFAULT_RATE_CAP + 1)
    void p
  })

  describe("targetKeyFor", () => {
    it("keys click/dblclick/dragStart/dragEnd by testId, falling back to tourKey then empty", () => {
      expect(targetKeyFor({
        eventType: "click", region: "header", target: { testId: "btn" }, monitor: { id: 0 }
      } as UiNotice)).toBe("btn")
      expect(targetKeyFor({
        eventType: "dblclick", region: "header", target: { testId: "btn2" }, monitor: { id: 0 }
      } as UiNotice)).toBe("btn2")
      expect(targetKeyFor({
        eventType: "dragStart", region: "workspace", target: { tourKey: "tour-1" },
        dragId: { source: "s" }, monitor: { id: 0 }
      } as UiNotice)).toBe("tour-1")
      expect(targetKeyFor({
        eventType: "dragEnd", region: "workspace", target: {},
        dragId: { source: "s" }, monitor: { id: 0 }
      } as UiNotice)).toBe("")
    })

    it("keys rateLimited and unknown event types as empty string", () => {
      expect(targetKeyFor({
        eventType: "rateLimited", monitor: { id: 0 }, droppedCount: 1, windowMs: 1000
      } as UiNotice)).toBe("")
      // default branch: unknown / unhandled event type
      expect(targetKeyFor({ eventType: "whatever" as any, monitor: { id: 0 } } as UiNotice)).toBe("")
    })
  })

  it("disposeAll clears timers", () => {
    const delivered: UiNotice[] = []
    const p = createDeliveryPipeline((_m, n) => delivered.push(n))
    const m = monitor(1)
    p.enqueue(m, appear("a"))
    p.enqueue(m, appear("a"))
    p.disposeAll()
    jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 1)
    expect(delivered).toHaveLength(1)
  })
})
