import { getRoot, IActionContext } from "mobx-state-tree"
import { withUndoRedoStrings } from "./codap-undo-types"
import { IApplyModelChangeOptions, IHistoryService, INotify, IWithoutUndoOptions } from "./history-service"
import { ILogFunctionEnv } from "../../lib/log-message"
import { DEBUG_UNDO } from "../../lib/debug"
import { ICoreNotification, ICoreNotifyFunctionEnv } from "../../data-interactive/notification-core-types"
import { getNotificationRequesterTileId } from "../../data-interactive/notification-requester"
import { isDataContextChangeNotice } from "../../data-interactive/notification-utils"
import { isAnsweringUndoRedo } from "../../data-interactive/undo-redo-answer"
import { getRunningActionCall, isChildOfUndoRedo, isUndoingOrRedoing, runningCalls } from "./tree-types"
import { withoutUndo } from "./without-undo"

interface IDependencies extends
  Partial<ILogFunctionEnv>, Partial<ICoreNotifyFunctionEnv>
{}

// The notifications an INotify describes, built now
function resolveNotifications(notify?: INotify): ICoreNotification[] {
  const actualNotifications = notify instanceof Function ? notify() : notify
  if (!actualNotifications) return []
  const notificationArray = Array.isArray(actualNotifications) ? actualNotifications : [actualNotifications]
  return notificationArray
    .map(_notification => typeof _notification === "function" ? _notification() : _notification)
    .filter(_notification => !!_notification)
}

export class AppHistoryService implements IHistoryService {
  tileEnv?: IDependencies
  // the notices to send when a history entry is undone or redone, by entry id. They hold callbacks, so they
  // can't be kept on the (MST) history entry itself.
  private entryNotices = new Map<string, { undo: ICoreNotification[], redo: ICoreNotification[] }>()

  setDependencies(dependencies: IDependencies) {
    this.tileEnv = dependencies
  }

  handleApplyModelChange(options?: IApplyModelChangeOptions) {
    const {
      log, notify, notifyTileId, excludeTileId, noDirty, keepRedo, undoStringKey, redoStringKey, suppressWarning
    } = options || {}

    // Add strings to undoable action or keep out of the undo stack
    if (undoStringKey != null && redoStringKey != null) {
      withUndoRedoStrings(undoStringKey, redoStringKey)
    } else {
      withoutUndo({ noDirty, suppressWarning })
      // A change made on purpose that can't be undone clears the redo list when it completes (see
      // TreeManager.completeHistoryEntry). Changes made while undoing or redoing don't, including those a custom
      // undo or redo makes through applyModelChange (MST's action context reaches the undo store's undo or
      // redo), nor does a plugin's request while it answers undoAction or redoAction for its own reported action
      // (undo-redo-answer.ts).
      // the env is the outermost action's, so a nested change marks the entry it belongs to
      const env = getRunningActionCall()?.env
      if (env && !noDirty && !keepRedo && !isUndoingOrRedoing() &&
          !isAnsweringUndoRedo(getNotificationRequesterTileId())) {
        env.clearsRedo = true
      }
    }

    // Keep the notices to send when this change is undone or redone
    const { undoNotify, redoNotify } = options || {}
    const historyEntryId = (undoNotify || redoNotify) && getRunningActionCall()?.env?.historyEntryId
    if (historyEntryId) {
      // several changes in one entry: undo reverses them, so their undo notices go out last change first
      const prior = this.entryNotices.get(historyEntryId)
      this.entryNotices.set(historyEntryId, {
        undo: [...resolveNotifications(undoNotify), ...(prior?.undo ?? [])],
        redo: [...(prior?.redo ?? []), ...resolveNotifications(redoNotify)]
      })
    }

    // Send log message to logger
    if (this.tileEnv?.log) {
      const logInfo = typeof log === "function" ? log() : log
      const logMessage = typeof logInfo === "string" ? { message: logInfo } : logInfo
      if (logMessage) {
        this.tileEnv.log(logMessage)
      }
    }

    // Broadcast notifications to plugins
    if (notify && this.tileEnv?.notify) {
      for (const { message, callback } of resolveNotifications(notify)) {
        // a plugin isn't sent the data context change notices broadcast while its own request is being
        // handled (see notification-requester.ts)
        const _excludeTileId = excludeTileId ??
          (isDataContextChangeNotice(message.resource) ? getNotificationRequesterTileId() : undefined)
        this.tileEnv.notify(message, callback ?? (() => null), notifyTileId, _excludeTileId)
      }
    }
  }

  // Forget the notices of entries no longer in the undo history
  pruneUndoRedoNotices(historyEntryIds: Set<string>) {
    Array.from(this.entryNotices.keys()).forEach(id => {
      if (!historyEntryIds.has(id)) this.entryNotices.delete(id)
    })
  }

  // Send every plugin the notices kept for a history entry that was just undone or redone. Nobody requested
  // the undo or redo, so nobody is left out.
  sendUndoRedoNotices(historyEntryId: string | undefined, operation: "undo" | "redo") {
    const notices = historyEntryId ? this.entryNotices.get(historyEntryId)?.[operation] : undefined
    notices?.forEach(({ message, callback }) => this.tileEnv?.notify?.(message, callback ?? (() => null)))
  }

  withoutUndo(actionCall: IActionContext, options?: IWithoutUndoOptions) {
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
      throw new Error("AppHistoryService.withoutUndo: " +
                      "environment is not setup on action tracking middleware call")
    }
    if (options?.noDirty) call.env.noDirty = true
    call.env.undoable = false
  }
}
