import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { logMonitorManager, LogMonitorFilter } from "../log-monitor-manager"

export const diLogMessageMonitorHandler: DIHandler = {
  register(resources: DIResources, values?: DIValues) {
    const clientId = resources.interactiveFrame?.id
    if (!clientId || !values) {
      return { success: false, values: { error: "clientId and filter values are required" } }
    }
    const filter = values as unknown as LogMonitorFilter
    const monitor = logMonitorManager.register(clientId, filter)
    return { success: true, values: { logMonitor: { id: monitor.id, clientId: monitor.clientId } } }
  },

  unregister(resources: DIResources, values?: DIValues) {
    const vals = values as any
    if (vals?.id != null) {
      return { success: logMonitorManager.unregister(vals.id) }
    }
    if (vals?.clientId) {
      logMonitorManager.unregisterByClientId(vals.clientId)
      return { success: true }
    }
    return { success: false, values: { error: "id or clientId required" } }
  }
}

registerDIHandler("logMessageMonitor", diLogMessageMonitorHandler)
