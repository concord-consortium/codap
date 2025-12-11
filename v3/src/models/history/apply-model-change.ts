import { IAnyStateTreeNode } from "mobx-state-tree"
import { ILogMessage } from "../../lib/log-message"
import { getHistoryService, INotify } from "./history-service"

export interface IApplyModelChangeOptions {
  log?: string | ILogMessage | (() => Maybe<string | ILogMessage>)
  notify?: INotify
  notifyTileId?: string
  // all changes dirty the document by default; specify noDirty to disable dirtying the document
  noDirty?: boolean
  // undo/redo strings indicate undo-ability; if not provided, the action is not undoable
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

      getHistoryService(self).handleApplyModelChange(options)

      return result
    }
  })
}
