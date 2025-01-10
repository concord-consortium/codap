import { getTileEnvironment } from "../tiles/tile-environment"
import { withUndoRedoStrings } from "./codap-undo-types"
import { registerHistoryService } from "./history-service"
import { withoutUndo } from "./without-undo"

registerHistoryService({
  handleApplyModelChange(mstNode, options) {
    const { log, notify, notifyTileId, undoStringKey, redoStringKey } = options || {}

    // Add strings to undoable action or keep out of the undo stack
    if (undoStringKey != null && redoStringKey != null) {
      withUndoRedoStrings(undoStringKey, redoStringKey)
    } else {
      withoutUndo()
    }

    const tileEnv = getTileEnvironment(mstNode)
    if (tileEnv) {
      // Send log message to logger
      if (tileEnv.log) {
        const logInfo = typeof log === "function" ? log() : log
        const logMessage = typeof logInfo === "string" ? { message: logInfo } : logInfo
        if (logMessage) {
          tileEnv.log(logMessage)
        }
      }

      // Broadcast notifications to plugins
      if (notify && tileEnv.notify) {
        // Convert notifications to INotification[]
        const actualNotifications = notify instanceof Function ? notify() : notify
        if (actualNotifications) {
          const notificationArray = Array.isArray(actualNotifications) ? actualNotifications : [actualNotifications]

          // Actually broadcast the notifications
          notificationArray.forEach(_notification => {
            const __notification = typeof _notification === "function" ? _notification() : _notification
            if (__notification) {
              const { message, callback } = __notification
              tileEnv.notify?.(message, callback ?? (() => null), notifyTileId)
            }
          })
        }
      }
    }
  }
})
