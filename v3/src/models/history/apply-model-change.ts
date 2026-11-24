import { IAnyStateTreeNode } from "mobx-state-tree"
import { beginNoticeBatch, endNoticeBatch } from "../../data-interactive/notification-batch"
import { getHistoryService, IApplyModelChangeOptions } from "./history-service"

// returns an object which defines the `applyModelChange` method on an MST model
// designed to be passed to `.actions()`, i.e. `.actions(applyModelChange)`
export function applyModelChange(self: IAnyStateTreeNode) {
  return ({
    // performs the specified action so that response actions are included and undo/redo strings assigned,
    // and sends the notices of the change, and of any changes made within it, together when it ends
    // (see notification-batch.ts)
    applyModelChange<TResult = unknown>(actionFn: () => TResult, options?: IApplyModelChangeOptions) {
      beginNoticeBatch()
      try {
        const result = actionFn()

        getHistoryService(self).handleApplyModelChange(options)

        return result
      } finally {
        endNoticeBatch()
      }
    }
  })
}
