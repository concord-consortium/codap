import iframePhone from "iframe-phone"
import { IAnyStateTreeNode } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { getTileEnvironment } from "../tiles/tile-environment"
import { withUndoRedoStrings } from "./codap-undo-types"
import { withoutUndo } from "./without-undo"

export interface IApplyActionOptions {
  notification?: {
    message: DIMessage
    callback?: iframePhone.ListenerCallback
  }
  redoStringKey?: string
  undoStringKey?: string
}
// returns an object which defines the `applyUndoableAction` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyUndoableAction)`
export function applyUndoableAction(self: IAnyStateTreeNode) {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned
    applyUndoableAction<TResult = unknown>(actionFn: () => TResult, options?: IApplyActionOptions) {
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
        const { message, callback } = options.notification
        tileEnv?.notify?.(message, callback ?? (() => null))
      }

      return result
    }
  })
}
