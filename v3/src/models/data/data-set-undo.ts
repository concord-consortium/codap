import { IAnyStateTreeNode, resolveIdentifier } from "mobx-state-tree"
import { HistoryEntryType } from "../history/history"
import { ICustomPatch } from "../history/tree-types"
import { registerCustomUndoRedo } from "../history/custom-undo-redo-registry"
import { ICase, IMoveAttributeOptions } from "./data-set-types"
// eslint-disable-next-line import/no-cycle
import { DataSet } from "./data-set"

export interface IMoveAttributeCustomPatch extends ICustomPatch {
  type: "DataSet.moveAttribute",
  data: {
    dataId: string
    attrId: string
    before?: IMoveAttributeOptions
    after?: IMoveAttributeOptions
  }
}
function isMoveAttributeCustomPatch(patch: ICustomPatch): patch is IMoveAttributeCustomPatch {
  return patch.type === "DataSet.moveAttribute"
}

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

registerCustomUndoRedo({
  "DataSet.moveAttribute": {
    undo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
      if (isMoveAttributeCustomPatch(patch)) {
        const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
        data?.moveAttribute(patch.data.attrId, patch.data.before)
      }
    },
    redo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
      if (isMoveAttributeCustomPatch(patch)) {
        const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
        data?.moveAttribute(patch.data.attrId, patch.data.after)
      }
    }
  },
  "DataSet.setCaseValues": {
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
})
