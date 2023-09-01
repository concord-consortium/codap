import { getRoot, getRunningActionContext } from "mobx-state-tree"
import { DEBUG_UNDO } from "../../lib/debug"
import { ICustomPatch, isChildOfUndoRedo, runningCalls } from "./tree-types"

/*
 * withCustomUndoRedo
 *
 * Adds a customPatch to the current action's history entry. This can be used to provide undo/redo
 * for actions that don't generate standard JSON patches (e.g. they only modify volatile properties)
 * or for actions that require specialized handling instead of the standard JSON patches.
 */
export function withCustomUndoRedo<T extends ICustomPatch = ICustomPatch>(customPatch: T) {
  const actionCall = getRunningActionContext()
  if (!actionCall) {
    throw new Error("withCustomUndoRedo called outside of an MST action")
  }

  if (actionCall.parentActionEvent) {
    if (!isChildOfUndoRedo(actionCall)) {
      // It is a little weird to print all this, but it seems like a good way to leave
      // this part unimplemented. Note that this comment was copied from withoutUndo()
      // and it may not apply identically in this context.
      console.warn([
        "withCustomUndoRedo() called by a child action. If calling a child action " +
        "with withCustomUndoRedo is something you need to do, update this code to support it. " +
        "There are several options for supporting it:",
        "   1. Ignore the call",
        "   2. Apply the withCustomUndoRedo to the parent action",
        "   3. Apply the withCustomUndoRedo just to the child action",
        "Notes:",
        "   - option 1 will be hard to debug, so if you do this, you should add a debug " +
        "option to print out a message when it is ignored",
        "   - option 3 will require changing the undo stack so it can record different " +
        "entries from the history stack. It will also require changing the recordPatches " +
        "function to somehow track this child action information."
      ].join('\n'))
    }
    return
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
  if (!call.env.customPatches) {
    call.env.customPatches = []
  }
  call.env.customPatches.push(customPatch)
}
