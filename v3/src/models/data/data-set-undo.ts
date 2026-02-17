import { IAnyStateTreeNode, resolveIdentifier } from "mobx-state-tree"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../lib/log-message"
import { kItemIdPrefix, v3Id } from "../../utilities/codap-utils"
import { ICustomUndoRedoPatcher } from "../history/custom-undo-redo-registry"
import { HistoryEntryType } from "../history/history"
import { ICustomPatch } from "../history/tree-types"
import { withCustomUndoRedo } from "../history/with-custom-undo-redo"
import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { CaseInfo, IAddCasesOptions, ICase, ICaseCreation, IItem } from "./data-set-types"
import { DataSet, IDataSet } from "./data-set"
import { createCasesNotification, deleteCasesNotification, moveCasesNotification, } from "./data-set-notifications"

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
 * setAttributeFormula custom undo/redo
 *
 * When a formula is set on an attribute, the formula manager recalculates and overwrites the
 * attribute's stored values. This custom undo/redo captures the values before the formula is
 * set so they can be restored on undo.
 */
interface ISetAttributeFormulaCustomPatch extends ICustomPatch {
  type: "DataSet.setAttributeFormula"
  data: {
    dataId: string
    attrId: string
    formula: string
    before: ICase[]
    beforeName?: string
    afterName?: string
  }
}
function isSetAttributeFormulaCustomPatch(patch: ICustomPatch): patch is ISetAttributeFormulaCustomPatch {
  return patch.type === "DataSet.setAttributeFormula"
}

const setAttributeFormulaCustomUndoRedoPatcher: ICustomUndoRedoPatcher = {
  // When custom patches are present, standard patches are skipped, so the custom
  // undo/redo handlers must handle both the formula change and the value restoration.
  undo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isSetAttributeFormulaCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      const attr = data?.attrFromID(patch.data.attrId)
      attr?.clearFormula()
      data?.setCaseValues(patch.data.before)
      if (patch.data.beforeName) {
        data?.setAttributeName(patch.data.attrId, patch.data.beforeName)
      }
    }
  },
  redo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isSetAttributeFormulaCustomPatch(patch)) {
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, patch.data.dataId)
      const attr = data?.attrFromID(patch.data.attrId)
      attr?.setDisplayExpression(patch.data.formula)
      if (patch.data.afterName) {
        data?.setAttributeName(patch.data.attrId, patch.data.afterName)
      }
    }
  }
}

export function setAttributeFormulaWithCustomUndoRedo(
  data: IDataSet, attribute: IAttribute, formula: string, newName?: string
) {
  // Only need to capture/restore values when adding a formula to an attribute that doesn't
  // already have one. When changing from one formula to another, the values are computed
  // and will be recalculated automatically.
  if (formula && !attribute.hasFormula) {
    const attrId = attribute.id
    const before: ICase[] = data.items.map(({ __id__ }) => {
      const index = data.getItemIndex(__id__)!
      return { __id__, [attrId]: attribute.strValue(index) }
    })
    const beforeName = newName && newName !== attribute.name ? attribute.name : undefined
    const afterName = beforeName ? newName : undefined

    attribute.setDisplayExpression(formula)
    if (afterName) {
      data.setAttributeName(attrId, afterName)
    }

    withCustomUndoRedo<ISetAttributeFormulaCustomPatch>({
      type: "DataSet.setAttributeFormula",
      data: { dataId: data.id, attrId, formula, before, beforeName, afterName }
    }, setAttributeFormulaCustomUndoRedoPatcher)
  } else {
    attribute.setDisplayExpression(formula)
    if (newName && newName !== attribute.name) {
      data.setAttributeName(attribute.id, newName)
    }
  }
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
    notify: createCasesNotification(items.map(({ __id__ }) => __id__), data),
    undoStringKey: "DG.Undo.caseTable.insertCases",
    redoStringKey: "DG.Redo.caseTable.insertCases",
    log: logMessageWithReplacement("insert %@ cases", {numCases: items.length})
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
    redoStringKey: "DG.Redo.data.deleteCases",
    log: logMessageWithReplacement("Delete %@ cases", {numCases: cases.length})
  })
}

/*
 * sortItems custom undo/redo
 */
interface ISortItemsCustomPatch extends ICustomPatch {
  type: "DataSet.sortItems",
  data: {
    dataId: string  // DataSet id
    attrId: string
    direction: "ascending" | "descending"
    beforeItemIds: string[]
    itemIdToIndexMap: Record<string, { beforeIndex: number, afterIndex: number }>
  }
}
function isSortItemsCustomPatch(patch: ICustomPatch): patch is ISortItemsCustomPatch {
  return patch.type === "DataSet.sortItems"
}

const sortItemsCustomUndoRedo: ICustomUndoRedoPatcher = {
  undo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isSortItemsCustomPatch(patch)) {
      const { dataId, beforeItemIds, itemIdToIndexMap } = patch.data
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, dataId)

      const afterIndices = beforeItemIds.map(itemId => itemIdToIndexMap[itemId].afterIndex)
      data?.attributes.forEach(attr => attr.orderValues(afterIndices))
      data?._itemIds.replace(beforeItemIds)
    }
  },
  redo: (node: IAnyStateTreeNode, patch: ICustomPatch, entry: HistoryEntryType) => {
    if (isSortItemsCustomPatch(patch)) {
      const { dataId, attrId, direction } = patch.data
      const data = resolveIdentifier<typeof DataSet>(DataSet, node, dataId)
      data?.sortByAttribute(attrId, direction)
    }
  }
}

type ISortDirection = "ascending" | "descending"
export function sortItemsWithCustomUndoRedo(data: IDataSet, attrId: string, direction: ISortDirection = "ascending") {

  const undoRedoPatch: ISortItemsCustomPatch = {
    type: "DataSet.sortItems",
    data: {
      dataId: data.id,
      attrId,
      direction,
      beforeItemIds: Array.from(data._itemIds),
      itemIdToIndexMap: {}  // filled in later
    }
  }

  // sort the items
  data?.applyModelChange(() => {
    withCustomUndoRedo(undoRedoPatch, sortItemsCustomUndoRedo)

    undoRedoPatch.data.itemIdToIndexMap = data?.sortByAttribute(attrId, direction) ?? {}
  }, {
    log: logStringifiedObjectMessage("Sort cases by attribute: %@",
            { attributeId: attrId, attribute: data?.getAttribute(attrId)?.name }),
    notify: moveCasesNotification(data),
    undoStringKey: "DG.Undo.caseTable.sortCases",
    redoStringKey: "DG.Redo.caseTable.sortCases"
  })
}
