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
export interface IApplyActionOptions {
  notification?: INotification | (() => INotification)
  redoStringKey?: string
  undoStringKey?: string
}
// returns an object which defines the `applyModelChange` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyModelChange)`
export function applyModelChange(self: IAnyStateTreeNode) {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned
    applyModelChange<TResult = unknown>(actionFn: () => TResult, options?: IApplyActionOptions) {
      const result = actionFn()

      // Add strings to undoable action or keep out of the undo stack
      if (options?.redoStringKey != null && options?.undoStringKey != null) {
        withUndoRedoStrings(options.undoStringKey, options.redoStringKey)
      } else {
        withoutUndo()
      }

      // Broadcast notification to plugins
      if (options?.notification) {
        const tileEnv = getTileEnvironment(self)
        const { notification } = options
        const { message, callback } = notification instanceof Function ? notification() : notification
        tileEnv?.notify?.(message, callback ?? (() => null))
      }

      return result
    }
  })
}
