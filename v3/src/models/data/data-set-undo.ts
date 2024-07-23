import { IAnyStateTreeNode, resolveIdentifier } from "mobx-state-tree"
import { HistoryEntryType } from "../history/history"
import { ICustomPatch } from "../history/tree-types"
import { ICustomUndoRedoPatcher } from "../history/custom-undo-redo-registry"
import { ICase, IItem } from "./data-set-types"
import { DataSet, IDataSet } from "./data-set"
import { withCustomUndoRedo } from "../history/with-custom-undo-redo"

export interface ISetCaseValuesCustomPatch extends ICustomPatch {
  type: "DataSet.setCaseValues"
  data: {
    dataId: string  // DataSet id
    before: IItem[]
    after: IItem[]
  }
}
function isSetCaseValuesCustomPatch(patch: ICustomPatch): patch is ISetCaseValuesCustomPatch {
  return patch.type === "DataSet.setCaseValues"
}

const setCaseValuesCustomUndoRedoPatcher: ICustomUndoRedoPatcher = {
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

export function setCaseValuesWithCustomUndoRedo(data: IDataSet, cases: ICase[], affectedAttributes?: string[]) {
  const items = data.getItemsForCases(cases)
  const itemIds = items.map(({ __id__ }) => __id__)
  const before = data.getItems(itemIds)

  data.setCaseValues(cases, affectedAttributes)

  // custom undo/redo since values aren't observed all the way down
  const after = data.getItems(itemIds)
  withCustomUndoRedo<ISetCaseValuesCustomPatch>({
    type: "DataSet.setCaseValues",
    data: { dataId: data.id, before, after }
  }, setCaseValuesCustomUndoRedoPatcher)
}

interface IItemBatch {
  beforeId?: string
  items: IItem[]
}

interface IRemoveCasesCustomPatch extends ICustomPatch {
  type: "DataSet.removeCases"
  data: {
    dataId: string    // DataSet id
    caseIds: string[]
    batches: IItemBatch[]
  }
}
function isRemoveCasesCustomPatch(patch: ICustomPatch): patch is IRemoveCasesCustomPatch {
  return patch.type === "DataSet.removeCases"
}

const removeCasesCustomUndoRedo: ICustomUndoRedoPatcher = {
  undo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isRemoveCasesCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      data && patch.data.batches.forEach(({ beforeId, items: cases }) => {
        data.addCases(cases, { before: beforeId })
      })
      // select newly restored cases
      data?.setSelectedCases(patch.data.caseIds)
    }
  },
  redo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isRemoveCasesCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      data?.removeCases(patch.data.caseIds)
    }
  }
}

export function removeCasesWithCustomUndoRedo(data: IDataSet, caseIds: string[]) {
  data.validateCases()

  // identify the items to remove
  const itemIdsToRemove = new Set<string>()
  caseIds.forEach(caseId => {
    const caseGroup = data.caseInfoMap.get(caseId)
    if (caseGroup) {
      caseGroup?.childItemIds.forEach(itemId => itemIdsToRemove.add(itemId))
    }
    else if (data.itemInfoMap.get(caseId) != null) {
      itemIdsToRemove.add(caseId)
    }
  })

  // identify the indices of the items to remove
  interface IItemToRemove { itemId: string, itemIndex?: number }
  type IFilteredItemToRemove = Required<IItemToRemove>
  const itemsToRemove = (Array.from(itemIdsToRemove)
                          .map(itemId => ({ itemId, itemIndex: data.getItemIndex(itemId) }))
                          .filter(({ itemIndex }) => itemIndex != null) as IFilteredItemToRemove[])
                          .sort((n1, n2) => n1.itemIndex - n2.itemIndex)

  // divide them into batches of contiguous items
  const undoRedoPatch: IRemoveCasesCustomPatch = {
    type: "DataSet.removeCases",
    data: {
      dataId: data.id,
      caseIds: [...caseIds],
      batches: []
    }
  }
  let firstIndex = -1
  let lastIndex = -1
  const nextBatch: IItemBatch = { items: [] }

  function completeBatch() {
    if (nextBatch.items.length) {
      nextBatch.beforeId = data.getItemAtIndex(lastIndex + 1)?.__id__
      undoRedoPatch.data.batches.push({...nextBatch})
    }
  }

  // separate the items into contiguous batches
  for (let i = 0; i < itemsToRemove.length; ++i) {
    const itemToRemove = itemsToRemove[i]
    const item = data.getItem(itemToRemove.itemId) ?? { __id__: itemToRemove.itemId }
    // start a new batch
    if (firstIndex === -1 || itemToRemove.itemIndex > lastIndex + 1) {
      // finish off the last batch
      completeBatch()
      // prepare the next batch
      firstIndex = lastIndex = itemToRemove.itemIndex
      nextBatch.beforeId = undefined
      nextBatch.items = [item]
    }
    // extend the current batch
    else {
      ++lastIndex
      nextBatch.items.push(item)
    }
  }
  // finish off the last batch
  completeBatch()

  // remove the cases
  data.applyModelChange(() => {
    withCustomUndoRedo(undoRedoPatch, removeCasesCustomUndoRedo)

    data.removeCases(caseIds)
  }, {
    undoStringKey: "DG.Undo.data.deleteCases",
    redoStringKey: "DG.Redo.data.deleteCases"
  })
}
