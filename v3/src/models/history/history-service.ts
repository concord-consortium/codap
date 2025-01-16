import { getEnv, hasEnv, IAnyStateTreeNode } from "mobx-state-tree"
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
  undoStringKey?: string
  redoStringKey?: string
}

export interface IHistoryService {
  handleApplyModelChange: (mstNode: IAnyStateTreeNode, options?: IApplyModelChangeOptions) => void
}

// This should be used when adding the history service to the MST Env
export interface IHistoryServiceEnv {
  historyService: IHistoryService
}

export function getHistoryService(node: IAnyStateTreeNode) {
  const env = node && hasEnv(node) ? getEnv<Partial<IHistoryServiceEnv>>(node) : undefined
  const historyService = env?.historyService
  if (!historyService) {
    throw new Error("History Service not found in MST environment")
  }
  return historyService
}
