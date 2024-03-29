import { withUndoRedoStrings } from "./codap-undo-types"
import { withoutUndo } from "./without-undo"

export interface IApplyActionOptions {
  redoStringKey?: string
  undoStringKey?: string
}
// returns an object which defines the `applyUndoableAction` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyUndoableAction)`
export function applyUndoableAction() {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned
    applyUndoableAction<TResult = unknown>(actionFn: () => TResult, options?: IApplyActionOptions) {
      const result = actionFn()
      if (options?.redoStringKey != null && options?.undoStringKey != null) {
        withUndoRedoStrings(options.undoStringKey, options.redoStringKey)
      } else {
        withoutUndo()
      }
      return result
    }
  })
}
