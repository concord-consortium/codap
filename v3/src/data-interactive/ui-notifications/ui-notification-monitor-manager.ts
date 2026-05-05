import { appState } from "../../models/app-state"
import { createDeliveryPipeline, DeliveryPipeline, DeliveryPipelineOptions } from "./debounce-and-rate-cap"
import { compileFilter, matchesMonitor, validateFilter } from "./filter-matching"
import { UiMonitor, UiNotice, UiNotificationFilter } from "./ui-notification-types"

interface DocumentBroadcaster {
  content?: {
    broadcastMessage: (message: Record<string, unknown>, callback: () => void, targetTileId?: string) => void
  }
}

export interface RegisterResult {
  ok: true
  id: number
  clientId?: string
}
export interface ErrorResult { ok: false; error: string }
export type OpResult = RegisterResult | ErrorResult

type SubscriberCountListener = (count: number) => void

function buildNoticePayload(notice: UiNotice): Record<string, unknown> {
  const { monitor, ...rest } = notice
  return {
    action: "notify",
    resource: "uiNotificationNotice",
    values: {
      ...rest,
      monitor: {
        id: monitor.id,
        ...(monitor.clientId != null ? { clientId: monitor.clientId } : {})
      }
    }
  }
}

export class UiNotificationMonitorManager {
  private monitors = new Map<number, UiMonitor>()
  private nextId = 1
  private subscriberCountListeners: SubscriberCountListener[] = []
  private documentProvider?: () => DocumentBroadcaster | undefined
  private cancelTimers?: (id: number) => void
  private pipeline: DeliveryPipeline

  constructor(pipelineOptions?: DeliveryPipelineOptions) {
    this.pipeline = createDeliveryPipeline(
      (monitor, notice) => this.broadcast(monitor, notice),
      pipelineOptions
    )
    this.cancelTimers = id => this.pipeline.cancelMonitor(id)
  }

  setDocumentProvider(provider: () => DocumentBroadcaster | undefined) {
    this.documentProvider = provider
  }

  setCancelPendingTimers(fn: (id: number) => void) {
    this.cancelTimers = fn
  }

  get size(): number {
    return this.monitors.size
  }

  getMonitor(id: number): UiMonitor | undefined {
    return this.monitors.get(id)
  }

  snapshot(): UiMonitor[] {
    return [...this.monitors.values()]
  }

  register(ownerTileId: string, filter: UiNotificationFilter, clientId?: string): OpResult {
    if (!ownerTileId) return { ok: false, error: "ownerTileId required" }
    const v = validateFilter(filter)
    if (!v.ok) return { ok: false, error: v.error ?? "invalid filter" }

    const previousSize = this.monitors.size
    const monitor: UiMonitor = {
      id: this.nextId++,
      clientId,
      ownerTileId,
      filter,
      compiled: compileFilter(filter)
    }
    this.monitors.set(monitor.id, monitor)
    if (previousSize === 0) this.emitSubscriberCount(1)
    return { ok: true, id: monitor.id, clientId: monitor.clientId }
  }

  update(id: number, filter: UiNotificationFilter): OpResult {
    const monitor = this.monitors.get(id)
    if (!monitor) return { ok: false, error: `monitor not found: ${id}` }
    const v = validateFilter(filter)
    if (!v.ok) return { ok: false, error: v.error ?? "invalid filter" }
    this.cancelTimers?.(id)
    monitor.filter = filter
    monitor.compiled = compileFilter(filter)
    return { ok: true, id: monitor.id, clientId: monitor.clientId }
  }

  unregister(id: number): OpResult {
    const monitor = this.monitors.get(id)
    if (!monitor) return { ok: false, error: `monitor not found: ${id}` }
    this.cancelTimers?.(id)
    this.monitors.delete(id)
    if (this.monitors.size === 0) this.emitSubscriberCount(0)
    return { ok: true, id: monitor.id, clientId: monitor.clientId }
  }

  unregisterAll() {
    const hadSubscribers = this.monitors.size > 0
    for (const id of Array.from(this.monitors.keys())) this.cancelTimers?.(id)
    this.monitors.clear()
    if (hadSubscribers) this.emitSubscriberCount(0)
  }

  onSubscriberCountChange(listener: SubscriberCountListener): () => void {
    this.subscriberCountListeners.push(listener)
    return () => {
      const i = this.subscriberCountListeners.indexOf(listener)
      if (i >= 0) this.subscriberCountListeners.splice(i, 1)
    }
  }

  private emitSubscriberCount(count: number) {
    for (const l of this.subscriberCountListeners) {
      try { l(count) } catch (e) { console.error("[ui-notifications] subscriber-count listener error", e) }
    }
  }

  deliver(notice: UiNotice): void {
    const monitors = this.snapshot()
    for (const monitor of monitors) {
      try {
        if (!this.monitors.has(monitor.id)) continue
        if (!matchesMonitor(monitor, notice)) continue
        this.pipeline.enqueue(monitor, notice)
      } catch (e) {
        console.error("[ui-notifications] delivery error", e)
      }
    }
  }

  deliverTo(monitorId: number, notice: UiNotice): void {
    const monitor = this.monitors.get(monitorId)
    if (!monitor) return
    try {
      this.broadcast(monitor, notice)
    } catch (e) {
      console.error("[ui-notifications] delivery error", e)
    }
  }

  private broadcast(monitor: UiMonitor, notice: UiNotice) {
    const doc = this.documentProvider?.()
    if (!doc?.content?.broadcastMessage) return
    const noticeWithMonitor: UiNotice = {
      ...notice,
      monitor: {
        id: monitor.id,
        ...(monitor.clientId != null ? { clientId: monitor.clientId } : {})
      }
    } as UiNotice
    const payload = buildNoticePayload(noticeWithMonitor)
    doc.content.broadcastMessage(payload, () => null, monitor.ownerTileId)
  }
}

export const uiNotificationMonitorManager = new UiNotificationMonitorManager()
uiNotificationMonitorManager.setDocumentProvider(() => appState.document)
