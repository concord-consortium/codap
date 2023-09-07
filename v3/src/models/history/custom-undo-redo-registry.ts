import { IAnyStateTreeNode } from "mobx-state-tree"
import { HistoryEntryType } from "./history"
import { ICustomPatch } from "./tree-types"

export interface ICustomUndoRedoPatcher {
  undo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => void
  redo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => void
}

const customUndoRedoPatchers: Record<string, ICustomUndoRedoPatcher> = {}

export function registerCustomUndoRedo(patchers: Record<string, ICustomUndoRedoPatcher>) {
  Object.keys(patchers).forEach(key => {
    customUndoRedoPatchers[key] = patchers[key]
  })
}

export function hasCustomUndoRedo(patch: ICustomPatch) {
  return !!customUndoRedoPatchers[patch.type]
}

export function applyCustomUndo(node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) {
  const patcher = customUndoRedoPatchers[patch.type]
  patcher?.undo(node, patch, entry)
}

export function applyCustomRedo(node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) {
  const patcher = customUndoRedoPatchers[patch.type]
  patcher?.redo(node, patch, entry)
}
