import { withUndoRedoStrings } from "./codap-undo-types"

// returns an object which defines the `applyUndoableAction` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyUndoableAction)`
export function applyUndoableAction() {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned
    applyUndoableAction<TResult = unknown>(actionFn: () => TResult, undoStringKey: string, redoStringKey: string) {
      const result = actionFn()
      withUndoRedoStrings(undoStringKey, redoStringKey)
      return result
    }
  })
}
