import { getRoot, getRunningActionContext } from "mobx-state-tree"
import { DEBUG_UNDO } from "../../lib/debug"
import { ICustomPatch, getRunningActionCall, isChildOfUndoRedo } from "./tree-types"
import { ICustomUndoRedoPatcher, registerCustomUndoRedo } from "./custom-undo-redo-registry"

/*
 * withCustomUndoRedo
 *
 * Adds a customPatch to the current action's history entry. This can be used to provide undo/redo
 * for actions that don't generate standard JSON patches (e.g. they only modify volatile properties)
 * or for actions that require specialized handling instead of the standard JSON patches.
 * Clients can register the custom undo/redo code separately by calling registerCustomUndoRedo directly,
 * or the undo/redo code can be passed as part of this call which will handle the registration.
 */
export function withCustomUndoRedo<T extends ICustomPatch = ICustomPatch>(patch: T, undoRedo?: ICustomUndoRedoPatcher) {
  const actionCall = getRunningActionContext()
  if (!actionCall) {
    throw new Error("withCustomUndoRedo called outside of an MST action")
  }

  if (isChildOfUndoRedo(actionCall)) return

  // find the currently extant running call
  const call = getRunningActionCall()
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
  // register the custom undo/redo code
  if (undoRedo) {
    registerCustomUndoRedo({ [patch.type]: undoRedo })
  }
  // add the new patch
  if (!call.env.customPatches) {
    call.env.customPatches = []
  }
  call.env.customPatches.push(patch)
}
