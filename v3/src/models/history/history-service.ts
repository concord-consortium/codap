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
  notifyTileId?: string
  noDirty?: boolean
  undoStringKey?: string
  redoStringKey?: string
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
