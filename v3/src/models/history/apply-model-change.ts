import { IAnyStateTreeNode } from "mobx-state-tree"
import { ICoreNotification } from "../../data-interactive/notification-core-types"
import { ILogMessage } from "../../lib/log-message"
import { getHistoryService } from "./history-service"

export type INotify =
  ICoreNotification |
  (ICoreNotification | (() => Maybe<ICoreNotification>))[] |
  (() => Maybe<ICoreNotification | ICoreNotification[]>)
export interface IApplyModelChangeOptions {
  log?: string | ILogMessage | (() => Maybe<string | ILogMessage>)
  notify?: INotify
  notifyTileId?: string
  undoStringKey?: string
  redoStringKey?: string
}

// returns an object which defines the `applyModelChange` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyModelChange)`
export function applyModelChange(self: IAnyStateTreeNode) {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned
    applyModelChange<TResult = unknown>(actionFn: () => TResult, options?: IApplyModelChangeOptions) {
      const result = actionFn()

      getHistoryService().handleApplyModelChange(self, options)

      return result
    }
  })
}
