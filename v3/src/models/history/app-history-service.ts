import { IAnyStateTreeNode } from "mobx-state-tree"
import { withUndoRedoStrings } from "./codap-undo-types"
import { IApplyModelChangeOptions, IHistoryService } from "./history-service"
import { withoutUndo } from "./without-undo"
import { ILogFunctionEnv } from "../../lib/log-message"
import { ICoreNotifyFunctionEnv } from "../../data-interactive/notification-core-types"

interface IDependencies extends
  Partial<ILogFunctionEnv>, Partial<ICoreNotifyFunctionEnv>
{}

export class AppHistoryService implements IHistoryService {
  tileEnv?: IDependencies

  setDependencies(dependencies: IDependencies) {
    this.tileEnv = dependencies
  }

  handleApplyModelChange(mstNode: IAnyStateTreeNode, options?: IApplyModelChangeOptions) {
    const { log, notify, notifyTileId, undoStringKey, redoStringKey } = options || {}

    // Add strings to undoable action or keep out of the undo stack
    if (undoStringKey != null && redoStringKey != null) {
      withUndoRedoStrings(undoStringKey, redoStringKey)
    } else {
      withoutUndo()
    }

    // Send log message to logger
    if (this.tileEnv?.log) {
      const logInfo = typeof log === "function" ? log() : log
      const logMessage = typeof logInfo === "string" ? { message: logInfo } : logInfo
      if (logMessage) {
        this.tileEnv.log(logMessage)
      }
    }

    // Broadcast notifications to plugins
    if (notify && this.tileEnv?.notify) {
      // Convert notifications to INotification[]
      const actualNotifications = notify instanceof Function ? notify() : notify
      if (actualNotifications) {
        const notificationArray = Array.isArray(actualNotifications) ? actualNotifications : [actualNotifications]

        // Actually broadcast the notifications
        for (const _notification of notificationArray) {
          const __notification = typeof _notification === "function" ? _notification() : _notification
          if (__notification) {
            const { message, callback } = __notification
            this.tileEnv.notify(message, callback ?? (() => null), notifyTileId)
          }
        }
      }
    }
  }
}
