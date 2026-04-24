import { UiMonitor, UiNotice, UiRateLimitedNotice } from "./ui-notification-types"

export const DEFAULT_DEBOUNCE_MS = 100
export const DEFAULT_RATE_CAP = 50
export const RATE_CAP_WINDOW_MS = 1000

const kDebouncedEventTypes = new Set([
  "appear", "disappear", "layoutChange", "dialogChange"
])

interface DebounceSlot {
  timer: ReturnType<typeof setTimeout>
  lastNotice: UiNotice
  sawAdditional: boolean
}

interface MonitorPipelineState {
  debounceSlots: Map<string, DebounceSlot>
  deliveryTimestamps: number[]
  rateLimitedPendingDropped: number
  rateLimitedWindowEndMs?: number
}

function targetKeyFor(notice: UiNotice): string {
  switch (notice.eventType) {
    case "appear":
    case "disappear":
      return `${notice.target?.componentId ?? ""}|${notice.target?.testId ?? ""}|${notice.target?.tourKey ?? ""}`
    case "layoutChange":
      return `${notice.setting}|${notice.target?.componentId ?? ""}`
    case "dialogChange":
      return [
        notice.dialogTarget?.testId ?? "",
        notice.control?.testId ?? "",
        notice.change.kind
      ].join("|")
    case "click":
    case "dblclick":
    case "dragStart":
    case "dragEnd":
      return notice.target?.testId ?? notice.target?.tourKey ?? ""
    case "rateLimited":
    default:
      return ""
  }
}

export interface DeliveryPipelineOptions {
  debounceMs?: number
  rateCap?: number
  rateCapWindowMs?: number
  /** For test overrides */
  nowMs?: () => number
}

export interface DeliveryPipeline {
  /** Queue a notice for delivery to this monitor; applies debounce + rate cap */
  enqueue(monitor: UiMonitor, notice: UiNotice): void
  /** Cancel all pending timers and reset window state for this monitor */
  cancelMonitor(monitorId: number): void
  /** Dispose everything */
  disposeAll(): void
}

/** Build a per-monitor delivery pipeline around a direct-broadcast function */
export function createDeliveryPipeline(
  broadcast: (monitor: UiMonitor, notice: UiNotice) => void,
  options: DeliveryPipelineOptions = {}
): DeliveryPipeline {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const rateCap = options.rateCap ?? DEFAULT_RATE_CAP
  const windowMs = options.rateCapWindowMs ?? RATE_CAP_WINDOW_MS
  const now = options.nowMs ?? (() => Date.now())
  const states = new Map<number, MonitorPipelineState>()

  function getState(id: number): MonitorPipelineState {
    let s = states.get(id)
    if (!s) {
      s = { debounceSlots: new Map(), deliveryTimestamps: [], rateLimitedPendingDropped: 0 }
      states.set(id, s)
    }
    return s
  }

  function applyRateCap(monitor: UiMonitor, notice: UiNotice): boolean {
    // rateLimited itself is exempt
    if (notice.eventType === "rateLimited") return true
    const state = getState(monitor.id)
    const ts = now()
    // Trim stale timestamps
    const minValid = ts - windowMs
    while (state.deliveryTimestamps.length > 0 && state.deliveryTimestamps[0] < minValid) {
      state.deliveryTimestamps.shift()
    }
    if (state.deliveryTimestamps.length >= rateCap) {
      // Drop this notice
      state.rateLimitedPendingDropped++
      if (state.rateLimitedWindowEndMs == null || ts > state.rateLimitedWindowEndMs) {
        // Emit one rateLimited per window
        const rl: UiRateLimitedNotice = {
          eventType: "rateLimited",
          monitor: { id: monitor.id, ...(monitor.clientId != null ? { clientId: monitor.clientId } : {}) },
          droppedCount: state.rateLimitedPendingDropped,
          windowMs
        }
        try { broadcast(monitor, rl) } catch (e) { console.error("[ui-notifications] rate-limited delivery error", e) }
        state.rateLimitedWindowEndMs = ts + windowMs
        state.rateLimitedPendingDropped = 0
      }
      return false
    }
    state.deliveryTimestamps.push(ts)
    return true
  }

  function directDeliver(monitor: UiMonitor, notice: UiNotice) {
    if (!applyRateCap(monitor, notice)) return
    try { broadcast(monitor, notice) } catch (e) { console.error("[ui-notifications] broadcast error", e) }
  }

  return {
    enqueue(monitor, notice) {
      if (!kDebouncedEventTypes.has(notice.eventType)) {
        directDeliver(monitor, notice)
        return
      }
      const state = getState(monitor.id)
      const key = `${notice.eventType}|${targetKeyFor(notice)}`
      const existing = state.debounceSlots.get(key)
      if (!existing) {
        // Leading edge: deliver immediately, start quiet timer
        directDeliver(monitor, notice)
        const timer = setTimeout(() => {
          const slot = state.debounceSlots.get(key)
          state.debounceSlots.delete(key)
          if (slot?.sawAdditional) directDeliver(monitor, slot.lastNotice)
        }, debounceMs)
        state.debounceSlots.set(key, { timer, lastNotice: notice, sawAdditional: false })
      } else {
        // Extend quiet period
        clearTimeout(existing.timer)
        existing.lastNotice = notice
        existing.sawAdditional = true
        const timer = setTimeout(() => {
          const slot = state.debounceSlots.get(key)
          state.debounceSlots.delete(key)
          if (slot?.sawAdditional) directDeliver(monitor, slot.lastNotice)
        }, debounceMs)
        existing.timer = timer
      }
    },
    cancelMonitor(monitorId) {
      const state = states.get(monitorId)
      if (!state) return
      for (const slot of state.debounceSlots.values()) clearTimeout(slot.timer)
      states.delete(monitorId)
    },
    disposeAll() {
      for (const state of states.values()) {
        for (const slot of state.debounceSlots.values()) clearTimeout(slot.timer)
      }
      states.clear()
    }
  }
}
