import { getRoot, getRunningActionContext } from "mobx-state-tree"
import { getTileEnvironment } from "../tiles/tile-environment"
import { DEBUG_UNDO } from "../../lib/debug"
import { withUndoRedoStrings } from "./codap-undo-types"
import { registerHistoryService } from "./history-service"
import { withoutUndo } from "./without-undo"
import { isChildOfUndoRedo, runningCalls } from "./tree-types"

registerHistoryService({
  handleApplyModelChange(mstNode, options) {
    const { log, notify, notifyTileId, undoStringKey, redoStringKey } = options || {}

    // Add strings to undoable action or keep out of the undo stack
    if (undoStringKey != null && redoStringKey != null) {
      withUndoRedoStrings(undoStringKey, redoStringKey)
    } else {
      withoutUndo()
    }

    const tileEnv = getTileEnvironment(mstNode)
    if (tileEnv) {
      // Send log message to logger
      if (tileEnv.log) {
        const logInfo = typeof log === "function" ? log() : log
        const logMessage = typeof logInfo === "string" ? { message: logInfo } : logInfo
        if (logMessage) {
          tileEnv.log(logMessage)
        }
      }

      // Broadcast notifications to plugins
      if (notify && tileEnv.notify) {
        // Convert notifications to INotification[]
        const actualNotifications = notify instanceof Function ? notify() : notify
        if (actualNotifications) {
          const notificationArray = Array.isArray(actualNotifications) ? actualNotifications : [actualNotifications]

          // Actually broadcast the notifications
          notificationArray.forEach(_notification => {
            const __notification = typeof _notification === "function" ? _notification() : _notification
            if (__notification) {
              const { message, callback } = __notification
              tileEnv.notify?.(message, callback ?? (() => null), notifyTileId)
            }
          })
        }
      }
    }
  },

  withoutUndo(options?: { suppressWarning?: boolean }) {
    const actionCall = getRunningActionContext()
    if (!actionCall) {
      throw new Error("withoutUndo called outside of an MST action")
    }

    if (actionCall.parentActionEvent) {
      if (!isChildOfUndoRedo(actionCall) && !options?.suppressWarning) {
        // It is a little weird to print all this, but it seems like a good way to leave
        // this part unimplemented.
        console.warn([
          `withoutUndo() called by a child action "${actionCall.name}". If calling a child action ` +
          "with withoutUndo is something you need to do, update this code to support it. " +
          "There are several options for supporting it:",
          "   1. Ignore the call",
          "   2. Ignore the call and pass { suppressWarning: true } to suppress the warning message",
          "      (This may make sense for actions called both as a parent and a child.)",
          "   3. Apply the withoutUndo to the parent action",
          "   4. Apply the withoutUndo just to the child action",
          "Notes:",
          "   - option 1 will be hard to debug, so if you do this, you should add a debug " +
          "option to print out a message when it is ignored",
          "   - option 2 may have issues depending on how the before/after state is saved internally",
          "   - option 4 will require changing the undo stack so it can record different " +
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
})
