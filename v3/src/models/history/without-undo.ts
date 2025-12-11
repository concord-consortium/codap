import { getRoot, getRunningActionContext } from "mobx-state-tree"
import { DEBUG_UNDO } from "../../lib/debug"
import { getHistoryServiceMaybe, IWithoutUndoOptions } from "./history-service"

/**
 * When added to the body of a MST action, this will prevent any changes
 * made by the action from being recorded in the CLUE undo stack. The changes
 * will still be recorded in the CLUE document history.
 *
 * If this action was called from another MST action it is considered a child
 * action. Child action changes are will be recorded unless the "root" action
 * has a withoutUndo. Because this can lead to unexpected behavior a warning
 * is printed when withoutUndo is called from a child action.
 *
 * There is an option so you can stop this warning. You can use this option
 * if you are OK with the behavior described above.
 *
 *   `withoutUndo({ suppressWarning: true })`
 *
*/
export function withoutUndo(options?: IWithoutUndoOptions) {
  const actionCall = getRunningActionContext()
  if (!actionCall) {
    throw new Error("withoutUndo called outside of an MST action")
  }

  const {context} = actionCall

  // The history service might be unset because:
  // withoutUndo is used in MST models which are created directly.
  //
  // The steps that happen are:
  // 1. the model is created directly
  // 2. a withoutUndo action is called on this model
  // 3. the model is then added to the document
  // On step 2 the historyService is undefined.
  //
  // MST does not allow the environment of a model to change when it is added
  // to a new tree. So the environment used in step 1 either has to be
  // undefined or the same as the document. Using the same environment in
  // two trees seems error prone.
  // An example of this is the `DataBroker.addDataSet` action
  const historyService = getHistoryServiceMaybe(context)
  if (DEBUG_UNDO && !historyService) {
    const root = getRoot(context)
    // Use duck typing to figure out if the root is a tree
    if ((root as any).treeMonitor) {
      console.warn("withoutUndo: history service has not been added to the MST tree")
    }
  }
  historyService?.withoutUndo(actionCall, options)
}
