import iframePhone from "iframe-phone"
import { IAnyStateTreeNode } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { getTileEnvironment } from "../tiles/tile-environment"
import { withUndoRedoStrings } from "./codap-undo-types"
import { withoutUndo } from "./without-undo"

interface INotification {
  message: DIMessage
  callback?: iframePhone.ListenerCallback
}
export interface IApplyModelChangeOptions {
  notifications?: INotification | INotification[] | (() => (INotification | INotification[] | undefined))
  redoStringKey?: string
  undoStringKey?: string
}
// returns an object which defines the `applyModelChange` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyModelChange)`
export function applyModelChange(self: IAnyStateTreeNode) {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned
    applyModelChange<TResult = unknown>(actionFn: () => TResult, options?: IApplyModelChangeOptions) {
      const result = actionFn()

      // Add strings to undoable action or keep out of the undo stack
      if (options?.redoStringKey != null && options?.undoStringKey != null) {
        withUndoRedoStrings(options.undoStringKey, options.redoStringKey)
      } else {
        withoutUndo()
      }

      // Broadcast notifications to plugins
      if (options?.notifications) {
        const tileEnv = getTileEnvironment(self)

        // Convert notifications to INotification[]
        const { notifications } = options
        const actualNotifications = notifications instanceof Function ? notifications() : notifications
        if (actualNotifications) {
          const notificationArray = Array.isArray(actualNotifications) ? actualNotifications : [actualNotifications]

          // Actually broadcast the notifications
          notificationArray.forEach(_notification => {
            const { message, callback } = _notification
            tileEnv?.notify?.(message, callback ?? (() => null))
          })
        }
      }

      return result
    }
  })
}
