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
  replaceArgs?: any[]
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
