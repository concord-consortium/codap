import { getRoot, getRunningActionContext } from "mobx-state-tree"
import { DEBUG_UNDO } from "../../lib/debug"
import { isChildOfUndoRedo, runningCalls } from "./tree-types"

export function withoutUndo() {
  const actionCall = getRunningActionContext()
  if (!actionCall) {
    throw new Error("withoutUndo called outside of an MST action")
  }

  if (actionCall.parentActionEvent) {
    if (!isChildOfUndoRedo(actionCall)) {
      // It is a little weird to print all this, but it seems like a good way to leave
      // this part unimplemented.
      console.warn([
        "withoutUndo() called by a child action. If calling a child action " +
        "with withoutUndo is something you need to do, update this code to support it. " +
        "There are several options for supporting it:",
        "   1. Ignore the call",
        "   2. Apply the withoutUndo to the parent action",
        "   3. Apply the withoutUndo just to the child action",
        "Notes:",
        "   - option 1 will be hard to debug, so if you do this, you should add a debug " +
        "option to print out a message when it is ignored",
        "   - option 3 will require changing the undo stack so it can record different " +
        "entries from the history stack. It will also require changing the recordPatches " +
        "function to somehow track this child action information."
      ].join('\n'))
      return
    }
  }

  const call = runningCalls.get(actionCall)
  if (!call) {
    // It is normal for there to be no running calls. This can happen in two cases:
    //   - the document isn't being edited so the tree monitor is disabled
    //   - the document content is part of the authored unit. In this case there is no
    //     DocumentModel so there is no middleware.
    if (DEBUG_UNDO) {
      try {
        const {context} = actionCall
        const root = getRoot(context)
        // Use duck typing to figure out if the root is a tree
        // and its tree monitor is enabled
        if ((root as any).treeMonitor?.enabled) {
          console.warn("cannot find action tracking middleware call")
        }
      } catch (error) {
        console.warn("cannot find action tracking middleware call, " +
          "error thrown while trying to find the tree", error)
      }
    }
    return
  }

  if (!call.env) {
    throw new Error("environment is not setup on action tracking middleware call")
  }
  call.env.undoable = false
}
