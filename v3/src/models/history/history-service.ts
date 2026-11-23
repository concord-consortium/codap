import { getEnv, hasEnv, IActionContext, IAnyStateTreeNode } from "mobx-state-tree"
import { ICoreNotification } from "../../data-interactive/notification-core-types"
import { ILogMessage } from "../../lib/log-message"

export type INotify =
  ICoreNotification |
  (ICoreNotification | (() => Maybe<ICoreNotification>))[] |
  (() => Maybe<ICoreNotification | ICoreNotification[]>)

export interface IApplyModelChangeOptions {
  log?: string | ILogMessage | (() => Maybe<string | ILogMessage>)
  notify?: INotify
  // notices sent to every plugin when this change is undone or redone, beside the document's undo or redo
  // notice. They are built when the change is made, so a tile the undo removes can still be described.
  undoNotify?: INotify
  redoNotify?: INotify
  notifyTileId?: string
  // tile to exclude from broadcast — e.g. the source plugin shouldn't get an echo of its own action
  excludeTileId?: string
  // all changes dirty the document by default; specify noDirty to disable dirtying the document
  noDirty?: boolean
  // a change that can't be undone clears the redo list by default; keepRedo leaves it, e.g. for the plugin
  // requests V2 made without touching its history
  keepRedo?: boolean
  // undo/redo strings indicate undo-ability; if not provided, the action is not undoable
  undoStringKey?: string
  redoStringKey?: string
  // suppress the "withoutUndo called by a child action" warning, for an action deliberately invoked
  // both at the top level and nested inside another action (e.g. the slider reset at a loop boundary)
  suppressWarning?: boolean
}

export interface IWithoutUndoOptions {
  noDirty?: boolean
  suppressWarning?: boolean
}

export interface IHistoryService {
  handleApplyModelChange: (options?: IApplyModelChangeOptions) => void
  withoutUndo: (actionCall: IActionContext, options?: IWithoutUndoOptions) => void
}

// This should be used when adding the history service to the MST Env
export interface IHistoryServiceEnv {
  historyService: IHistoryService
}

export function getHistoryServiceMaybe(node: IAnyStateTreeNode) {
  const env = node && hasEnv(node) ? getEnv<Partial<IHistoryServiceEnv>>(node) : undefined
  return env?.historyService
}

export function getHistoryService(node: IAnyStateTreeNode) {
  const historyService = getHistoryServiceMaybe(node)
  if (!historyService) {
    throw new Error("History Service not found in MST environment")
  }
  return historyService
}
