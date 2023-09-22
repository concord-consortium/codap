import { getRoot, getRunningActionContext } from "mobx-state-tree"
import { DEBUG_UNDO } from "../../lib/debug"
import { IClientUndoData, getRunningActionCall } from "./tree-types"

/*
 * withClientUndoData
 *
 * Adds client metadata to the current history entry.
 */
export function withClientUndoData<T extends IClientUndoData = IClientUndoData>(clientData: T) {
  const actionCall = getRunningActionContext()
  if (!actionCall) {
    throw new Error("withClientUndoData called outside of an MST action")
  }

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
  call.env.clientData = clientData
}
