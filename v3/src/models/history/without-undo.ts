import { getRoot, getRunningActionContext } from "mobx-state-tree"
import { getHistoryServiceMaybe } from "./history-service"
import { DEBUG_UNDO } from "../../lib/debug"

export function withoutUndo(options?: { suppressWarning?: boolean }) {
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
      console.warn("history service has not been added to the MST tree")
    }
  }
  historyService?.withoutUndo(actionCall, options)
}
