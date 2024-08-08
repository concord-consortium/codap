import iframePhone from "iframe-phone"
import { IAnyStateTreeNode } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { getTileEnvironment } from "../tiles/tile-environment"
import { withUndoRedoStrings } from "./codap-undo-types"
import { withoutUndo } from "./without-undo"

export interface ILogMessage {
  message: string
  arg: Array<number | string | boolean>
}
export interface INotification {
  message: DIMessage
  callback?: iframePhone.ListenerCallback
}
export interface IApplyModelChangeOptions {
  log?: string | ILogMessage | (() => Maybe<string | ILogMessage>)
  notify?: INotification | INotification[] | (() => Maybe<INotification | INotification[]>)
  undoStringKey?: string
  redoStringKey?: string
}
// returns an object which defines the `applyModelChange` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyModelChange)`
export function applyModelChange(self: IAnyStateTreeNode) {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned
    applyModelChange<TResult = unknown>(actionFn: () => TResult, options?: IApplyModelChangeOptions) {
      const { log, notify, undoStringKey, redoStringKey } = options || {}
      const result = actionFn()

      // Add strings to undoable action or keep out of the undo stack
      if (undoStringKey != null && redoStringKey != null) {
        withUndoRedoStrings(undoStringKey, redoStringKey)
      } else {
        withoutUndo()
      }

      const tileEnv = getTileEnvironment(self)
      if (tileEnv) {
        // Send log message to logger
        if (tileEnv.log) {
          const logInfo = typeof log === "function" ? log() : log
          const message = typeof logInfo === "string" ? logInfo : logInfo?.message
          const event_value = typeof logInfo === "object" ? logInfo.event_value : undefined
          const parameters = typeof logInfo === "object" ? logInfo.parameters : undefined
          if (message) {
            tileEnv.log(message, event_value, parameters)
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
              const { message, callback } = _notification
              tileEnv.notify?.(message, callback ?? (() => null))
            })
          }
        }
      }

      return result
    }
  })
}
