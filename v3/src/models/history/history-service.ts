import { IAnyStateTreeNode } from "mobx-state-tree"
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
  withoutUndo: (options?: { suppressWarning?: boolean }) => void
}

const gHistoryServiceRef: {ref?: IHistoryService} = {}

export function getHistoryService() {
  if (!gHistoryServiceRef.ref) {
    throw new Error("History Service must be registered before it is used")
  }
  return gHistoryServiceRef.ref
}

export function registerHistoryService(service: IHistoryService) {
  gHistoryServiceRef.ref = service
}
