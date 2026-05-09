import { IAnyStateTreeNode } from "mobx-state-tree"
import { getHistoryService, IApplyModelChangeOptions } from "./history-service"

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
