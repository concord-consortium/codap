import { IAnyStateTreeNode, resolveIdentifier } from "mobx-state-tree"
import { kItemIdPrefix, v3Id } from "../../utilities/codap-utils"
import { ICustomUndoRedoPatcher } from "../history/custom-undo-redo-registry"
import { HistoryEntryType } from "../history/history"
import { ICustomPatch } from "../history/tree-types"
import { withCustomUndoRedo } from "../history/with-custom-undo-redo"
import { ICollectionModel } from "./collection"
import { CaseInfo, IAddCasesOptions, ICase, ICaseCreation, IItem } from "./data-set-types"
import { DataSet, IDataSet } from "./data-set"
import { deleteCasesNotification, } from "./data-set-notifications"

/*
 * setCaseValues custom undo/redo
 */
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

/*
 * insertCases custom undo/redo
 */
interface IInsertCasesCustomPatch extends ICustomPatch {
  type: "DataSet.insertCases",
  data: {
    dataId: string  // DataSet id
    items: IItem[]
    options: IAddCasesOptions
  }
}
function isInsertCasesCustomPatch(patch: ICustomPatch): patch is IInsertCasesCustomPatch {
  return patch.type === "DataSet.insertCases"
}

const insertCasesCustomUndoRedo: ICustomUndoRedoPatcher = {
  undo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isInsertCasesCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      const itemIds = patch.data.items.map(({ __id__ }) => __id__)
      if (data && itemIds.length) {
        data.removeCases(itemIds)
      }
    }
  },
  redo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isInsertCasesCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      data?.addCases(patch.data.items, patch.data.options)
    }
  }
}

export function insertCasesWithCustomUndoRedo(data: IDataSet, cases: ICaseCreation[], _options: IAddCasesOptions = {}) {
  data.validateCases()

  const options = { ..._options }

  let siblingCaseId: Maybe<string>
  let caseInfo: Maybe<CaseInfo>
  let collection: Maybe<ICollectionModel>
  if (options.before) {
    caseInfo = data.caseInfoMap.get(options.before)
    collection = data.getCollection(caseInfo?.collectionId)
    if (collection && caseInfo) {
      siblingCaseId = options.before
      options.before = caseInfo.childItemIds[0]
    }
  } else if (options.after) {
    caseInfo = data.caseInfoMap.get(options.after)
    collection = data.getCollection(caseInfo?.collectionId)
    if (collection && caseInfo) {
      siblingCaseId = options.after
      options.after = caseInfo.childItemIds[caseInfo.childItemIds.length - 1]
    }
  }

  // add ids if they're not already present
  const items: IItem[] = cases.map(aCase => ({ __id__: v3Id(kItemIdPrefix), ...aCase }))

  // add parent case values
  const parentCollection = collection?.parent
  const parentCase = siblingCaseId
                      ? parentCollection?.caseGroups.find(group => group.childCaseIds?.includes(siblingCaseId))
                      : undefined
  const parentCaseId = parentCase?.groupedCase.__id__
  if (parentCollection && parentCaseId) {
    parentCollection.allDataAttributes.forEach(attr => {
      items.forEach(item => {
        item[attr.id] = data.getValue(parentCaseId, attr.id)
      })
    })
  }

  const undoRedoPatch: IInsertCasesCustomPatch = {
    type: "DataSet.insertCases",
    data: { dataId: data.id, items, options }
  }

  // insert the items
  data.applyModelChange(() => {
    withCustomUndoRedo(undoRedoPatch, insertCasesCustomUndoRedo)

    data.addCases(items, options)
  }, {
    // notify: insertCasesNotification(data, cases),
    undoStringKey: "DG.Undo.caseTable.insertCases",
    redoStringKey: "DG.Redo.caseTable.insertCases"
  })
}

/*
 * removeCases custom undo/redo
 */
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

  // identify the items to remove and build up removed cases for notification
  const itemIdsToRemove = new Set<string>()
  const cases: ICase[] = []
  caseIds.forEach(caseId => {
    const caseGroup = data.caseInfoMap.get(caseId)
    if (caseGroup) {
      caseGroup.childItemIds.forEach(itemId => itemIdsToRemove.add(itemId))
      cases.push(caseGroup.groupedCase)
    }
    else if (data.itemInfoMap.get(caseId) != null) {
      itemIdsToRemove.add(caseId)
      const childCase = data.itemIdChildCaseMap.get(caseId)
      if (childCase) cases.push(childCase.groupedCase)
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
    notify: deleteCasesNotification(data, cases),
    undoStringKey: "DG.Undo.data.deleteCases",
    redoStringKey: "DG.Redo.data.deleteCases"
  })
}
