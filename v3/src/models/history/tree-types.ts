import { getPath, getRunningActionContext, getType, IActionContext, IPatchRecorder } from "mobx-state-tree"
import { IActionTrackingMiddleware3Call } from "./create-action-tracking-middleware-3"
import { SharedModelMapSnapshotOutType } from "../document/shared-model-entry"

export interface ICustomPatch {
  type: string
  data: any
}

export type IClientUndoData = Record<string, string | number | boolean>

export interface CallEnv {
  recorder: IPatchRecorder
  // FIXME: this breaks the abstraction, and means the tree monitor
  // wouldn't work in an iframe tree.
  initialSharedModelMap: SharedModelMapSnapshotOutType
  sharedModelModifications: SharedModelModifications
  historyEntryId: string
  exchangeId: string
  undoable: boolean
  customPatches?: ICustomPatch[]
  clientData?: IClientUndoData
}

export function isValidCallEnv(env?: CallEnv): env is CallEnv {
  return !!env && !!env.recorder && !!env.initialSharedModelMap &&
    !!env.sharedModelModifications && !!env.historyEntryId && !!env.exchangeId && env.undoable != null
}

export type SharedModelModifications = Record<string, number>

export const runningCalls = new WeakMap<IActionContext, IActionTrackingMiddleware3Call<CallEnv>>()

// find the currently extant running call
export function getRunningActionCall() {
  let actionCall = getRunningActionContext()
  if (!actionCall) return

  let call = runningCalls.get(actionCall)
  while (!call && actionCall?.parentActionEvent) {
    actionCall = actionCall?.parentActionEvent
    call = runningCalls.get(actionCall)
  }
  return call
}

// returns true if the specified action is a child of an "undo" or "redo" action
export function isChildOfUndoRedo(actionCall?: IActionContext) {
  if (actionCall && ["undo", "redo"].includes(actionCall.name)) return true
  let parentEvent = actionCall?.parentActionEvent
  while (parentEvent) {
    if (["undo", "redo"].includes(parentEvent.name)) return true
    parentEvent = parentEvent.parentActionEvent
  }
  return false
}

export function isUndoingOrRedoing() {
  return isChildOfUndoRedo(getRunningActionContext())
}

export function getActionModelName(call: IActionTrackingMiddleware3Call<CallEnv>) {
  return getType(call.actionCall.context).name
}

export function getActionName(call: IActionTrackingMiddleware3Call<CallEnv>) {
  return call.actionCall.name
}

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
