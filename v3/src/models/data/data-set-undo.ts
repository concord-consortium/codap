import { IAnyStateTreeNode, resolveIdentifier } from "mobx-state-tree"
import { HistoryEntryType } from "../history/history"
import { ICustomPatch } from "../history/tree-types"
import { ICustomUndoRedoPatcher } from "../history/custom-undo-redo-registry"
import { ICase } from "./data-set-types"
// eslint-disable-next-line import/no-cycle
import { DataSet } from "./data-set"

export interface ISetCaseValuesCustomPatch extends ICustomPatch {
  type: "DataSet.setCaseValues"
  data: {
    dataId: string  // DataSet id
    before: ICase[]
    after: ICase[]
  }
}
function isSetCaseValuesCustomPatch(patch: ICustomPatch): patch is ISetCaseValuesCustomPatch {
  return patch.type === "DataSet.setCaseValues"
}

export const setCaseValuesCustomUndoRedo: ICustomUndoRedoPatcher = {
  undo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isSetCaseValuesCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      data?.setCaseValues(patch.data.before)
    }
  },
  redo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isSetCaseValuesCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      data?.setCaseValues(patch.data.after)
    }
  }
}
