import { getPath, IActionContext, IPatchRecorder } from "mobx-state-tree"
import { IActionTrackingMiddleware3Call } from "./create-action-tracking-middleware-3"

export interface CallEnv {
  recorder: IPatchRecorder
  sharedModelModifications: SharedModelModifications
  historyEntryId: string
  exchangeId: string
  undoable: boolean
}

export type SharedModelModifications = Record<string, number>

export const runningCalls = new WeakMap<IActionContext, IActionTrackingMiddleware3Call<CallEnv>>()

export function getActionPath(call: IActionTrackingMiddleware3Call<CallEnv>) {
  return `${getPath(call.actionCall.context)}/${call.actionCall.name}`
}

export const actionsFromManager = [
  // Because we haven't implemented applySharedModelSnapshotFromManager
  // yet, all calls to handleSharedModelChanges are actually internal
  // calls. However we treat those calls as actions from the manager
  // because we want any changes triggered by a shared model update added
  // to the same history entry.
  "handleSharedModelChanges",
  "applyPatchesFromManager",
  "startApplyingPatchesFromManager",
  "finishApplyingPatchesFromManager",
  // We haven't implemented this yet, it is needed to support two trees
  // working with the same shared model
  "applySharedModelSnapshotFromManager"
]

export function isActionFromManager(call: IActionTrackingMiddleware3Call<CallEnv>) {
  const actionName = call.actionCall.name
  return actionsFromManager.includes(actionName)
}
