import { initializeUiNotifications } from "../ui-notifications/install"
import { uiNotificationMonitorManager } from "../ui-notifications/ui-notification-monitor-manager"
import { UiNotificationFilter } from "../ui-notifications/ui-notification-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { errorResult, noInteractiveFrameResult, valuesRequiredResult } from "./di-results"

interface MonitorRequestValues extends UiNotificationFilter {
  clientId?: string
  id?: number | string
}

function parseMonitorId(raw: string | number | undefined): number | undefined {
  if (raw == null || raw === "") return undefined
  const asNum = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(asNum) ? asNum : undefined
}

function resolveOwnerTileId(resources: DIResources): string | undefined {
  const frame = resources.interactiveFrame
  if (!frame) return undefined
  const v3Id = typeof frame === "object" && "id" in frame ? (frame as { id?: string }).id : undefined
  return v3Id
}

export const diUiNotificationMonitorHandler: DIHandler = {
  notify(resources: DIResources, values?: DIValues) {
    const ownerTileId = resolveOwnerTileId(resources)
    if (!ownerTileId) return noInteractiveFrameResult
    if (values == null) return valuesRequiredResult
    const { clientId, ...filter } = values as MonitorRequestValues
    const result = uiNotificationMonitorManager.register(ownerTileId, filter, clientId)
    if (!result.ok) return errorResult(result.error)
    return {
      success: true as const,
      values: {
        id: result.id,
        ...(result.clientId != null ? { clientId: result.clientId } : {})
      }
    }
  },

  update(resources: DIResources, values?: DIValues) {
    const ownerTileId = resolveOwnerTileId(resources)
    if (!ownerTileId) return noInteractiveFrameResult
    const requestValues = (values ?? {}) as MonitorRequestValues
    const selectorId = parseMonitorId(resources.uiNotificationMonitor)
    const bodyId = parseMonitorId(requestValues.id)
    const id = selectorId ?? bodyId
    if (id == null) return errorResult("monitor id required")
    // Don't leak whether the id exists under another plugin — use the same
    // "not found" error for both a missing id and an id owned by a different
    // plugin so a caller can't discover other plugins' monitors by probing.
    if (uiNotificationMonitorManager.getMonitor(id)?.ownerTileId !== ownerTileId) {
      return errorResult(`monitor not found: ${id}`)
    }
    const { id: _id, clientId: _clientId, ...filter } = requestValues
    const result = uiNotificationMonitorManager.update(id, filter)
    if (!result.ok) return errorResult(result.error)
    return {
      success: true as const,
      values: {
        id: result.id,
        ...(result.clientId != null ? { clientId: result.clientId } : {})
      }
    }
  },

  delete(resources: DIResources, values?: DIValues) {
    const ownerTileId = resolveOwnerTileId(resources)
    if (!ownerTileId) return noInteractiveFrameResult
    const requestValues = (values ?? {}) as MonitorRequestValues
    const selectorId = parseMonitorId(resources.uiNotificationMonitor)
    const bodyId = parseMonitorId(requestValues.id)
    const id = selectorId ?? bodyId
    if (id == null) return errorResult("monitor id required")
    if (uiNotificationMonitorManager.getMonitor(id)?.ownerTileId !== ownerTileId) {
      return errorResult(`monitor not found: ${id}`)
    }
    const result = uiNotificationMonitorManager.unregister(id)
    if (!result.ok) return errorResult(result.error)
    return { success: true as const }
  }
}

registerDIHandler("uiNotificationMonitor", diUiNotificationMonitorHandler)
initializeUiNotifications()
