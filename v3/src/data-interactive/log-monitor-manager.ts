import { LoggableValue } from "../lib/log-message"
import { Logger } from "../lib/logger"

interface DocumentBroadcaster {
  content?: {
    broadcastMessage: (message: Record<string, unknown>, callback: () => void, targetTileId?: string) => void
  }
}

export interface LogMonitorFilter {
  topic?: string
  topicPrefix?: string
  formatStr?: string
  formatPrefix?: string
  message?: string  // exact match or "*" for all
}

export interface LogMonitor {
  id: number
  clientId: string
  filter: LogMonitorFilter
}

export interface LogEventInfo {
  message: string
  formatStr: string
  topic?: string
  replaceArgs?: LoggableValue[]
}

function matchesFilter(filter: LogMonitorFilter, event: LogEventInfo): boolean {
  if (filter.topic != null) {
    if (event.topic !== filter.topic) return false
  }
  if (filter.topicPrefix != null) {
    if (!event.topic?.startsWith(filter.topicPrefix)) return false
  }
  if (filter.formatStr != null) {
    if (event.formatStr !== filter.formatStr) return false
  }
  if (filter.formatPrefix != null) {
    if (!event.formatStr?.startsWith(filter.formatPrefix)) return false
  }
  if (filter.message != null) {
    if (filter.message !== "*" && event.message !== filter.message) return false
  }
  return true
}

export class LogMonitorManager {
  private monitors: LogMonitor[] = []
  private nextId = 1
  private documentProvider?: () => DocumentBroadcaster | undefined

  setDocumentProvider(provider: () => DocumentBroadcaster | undefined) {
    this.documentProvider = provider
  }

  notifyMatchingMonitors(event: LogEventInfo) {
    const matches = this.evaluateLogEvent(event)
    if (matches.length === 0) return

    const document = this.documentProvider?.()
    if (!document?.content?.broadcastMessage) return

    for (const monitor of matches) {
      const notice = {
        action: "notify",
        resource: "logMessageNotice",
        values: {
          message: event.message,
          formatStr: event.formatStr,
          ...(event.topic != null ? { topic: event.topic } : {}),
          ...(event.replaceArgs != null ? { replaceArgs: event.replaceArgs } : {}),
          logMonitor: { id: monitor.id, clientId: monitor.clientId }
        }
      }
      document.content.broadcastMessage(notice, () => null, monitor.clientId)
    }
  }

  register(clientId: string, filter: LogMonitorFilter): LogMonitor {
    const monitor: LogMonitor = { id: this.nextId++, clientId, filter }
    this.monitors.push(monitor)
    return monitor
  }

  unregister(id: number): boolean {
    const index = this.monitors.findIndex(m => m.id === id)
    if (index === -1) return false
    this.monitors.splice(index, 1)
    return true
  }

  unregisterByClientId(clientId: string) {
    this.monitors = this.monitors.filter(m => m.clientId !== clientId)
  }

  unregisterAll() {
    this.monitors = []
  }

  evaluateLogEvent(event: LogEventInfo): LogMonitor[] {
    return this.monitors.filter(m => matchesFilter(m.filter, event))
  }
}

export const logMonitorManager = new LogMonitorManager()

// Register a Logger listener to evaluate CODAP-originated log events against
// registered monitors. DI-originated events with topics are handled separately
// by the logMessage handler (which calls notifyMatchingMonitors directly).
Logger.registerLogListener((logMessage) => {
  const eventInfo: LogEventInfo = {
    message: logMessage.event,
    formatStr: logMessage.event,
    // CODAP-originated events have no topic
  }
  logMonitorManager.notifyMatchingMonitors(eventInfo)
})
