import { isAlive } from "mobx-state-tree"
import { logMessageWithReplacement } from "../../lib/log-message"
import { getMetadataFromDataSet } from "../shared/shared-data-utils"
import { INotify } from "../history/history-service"
import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { IDataSet } from "./data-set"
import {
  createCasesNotification, deleteCasesNotification, deleteCollectionNotification,
  moveAttributeNotification, selectCasesNotification
} from "./data-set-notifications"
import { IAttributeChangeResult, IMoveAttributeOptions } from "./data-set-types"

export function getCollectionAttrs(collection: ICollectionModel, data?: IDataSet): IAttribute[] {
  if (collection && !isAlive(collection)) {
    console.warn("DataSetUtils.getCollectionAttrs called for defunct collection")
    return []
  }
  return Array.from(collection.attributes) as IAttribute[]
}

export function collectionCaseIdFromIndex(index: number, data?: IDataSet, collectionId?: string) {
  if (!data) return undefined
  const cases = data.getCasesForCollection(collectionId)
  return cases[index]?.__id__
}

export function collectionCaseIndexFromId(caseId: string, data?: IDataSet, collectionId?: string) {
  if (!data) return undefined
  const cases = data.getCasesForCollection(collectionId)
  // for now, linear search through pseudo-cases; could index if performance becomes a problem.
  const found = cases.findIndex(aCase => aCase.__id__ === caseId)
  return found >= 0 ? found : undefined
}

export function isAnyChildSelected(data: IDataSet, caseId: string): boolean {
  const caseInfo = data.caseInfoMap.get(caseId)
  const { childCaseIds, childItemIds = [] } = caseInfo || {}
  return childCaseIds?.length
          ? childCaseIds.some(childCaseId => isAnyChildSelected(data, childCaseId))
          : childItemIds?.some(childItemId => data.isCaseSelected(childItemId))
}

/**
 * Returns the collection containing the attribute from the given array that is closest to the
 * root of the data set. If there is an attribute that is not in any collection, then we return undefined
 * indicating that the client should use the root as the source of cases.
 */
export function idOfChildmostCollectionForAttributes(attrIDs: string[], data?: IDataSet) {
  if (!data) return undefined
  const collections = data.collections,
    length = collections.length
  for (let i = length - 1; i >= 0; --i) {
    const collection = collections[i]
    if (collection.attributes.some(attr => attrIDs.includes(attr?.id ?? ""))) return collection.id
  }
  // If we didn't find one, return the id of the childmost collection
  return length > 0 ? collections[length - 1].id : undefined
}

export function firstVisibleParentAttribute(data?: IDataSet, collectionId?: string): IAttribute | undefined {
  if (!collectionId) return
  const metadata = data && getMetadataFromDataSet(data)
  const parentCollection = data?.getParentCollection(collectionId)
  return parentCollection?.attributes.find(attr => attr && !metadata?.isHidden(attr.id))
}

interface IMoveAttributeParameters {
  afterAttrId?: string
  attrId: string
  dataset: IDataSet
  includeNotifications?: boolean
  sourceCollection?: ICollectionModel
  targetCollection: ICollectionModel
  undoable?: boolean
}
export function moveAttribute({
  afterAttrId, attrId, dataset, includeNotifications, sourceCollection, targetCollection, undoable
}: IMoveAttributeParameters) {
  const firstAttr: IAttribute | undefined = getCollectionAttrs(targetCollection, dataset)[0]
  const options: IMoveAttributeOptions =
    afterAttrId ? { after: afterAttrId }: { before: firstAttr?.id }

  // bail if we're moving the attribute before/after itself
  if (attrId === options.after || attrId === options.before) return

  const notifications = includeNotifications ? moveAttributeNotification(dataset) : undefined
  const undoStringKey = undoable ? "DG.Undo.dataContext.moveAttribute" : undefined
  const redoStringKey = undoable ? "DG.Redo.dataContext.moveAttribute" : undefined
  const logMessage = logMessageWithReplacement("Moved attribute %@ to %@ collection",
                        { attrId, collection: targetCollection.name ?? "new" })
  const modelChangeOptions = { notify: notifications, undoStringKey, redoStringKey, log: logMessage }

  if (targetCollection.id === sourceCollection?.id) {
    // move the attribute within a collection
    dataset.applyModelChange(
      () => targetCollection.moveAttribute(attrId, options),
      modelChangeOptions
    )
  }
  else {
    // move the attribute to a new collection
    let result: IAttributeChangeResult | undefined
    const _notifications = includeNotifications && notifications
      ? () => result?.removedCollectionId
        ? [deleteCollectionNotification(dataset), notifications]
        : notifications
      : undefined

    dataset.applyModelChange(
      () => {
        result = dataset.moveAttribute(attrId, { collection: targetCollection?.id, ...options })
      },
      { notify: _notifications, undoStringKey, redoStringKey, log: logMessage }
    )
  }
}

// Selection helper functions

function selectWithNotification(func: () => void, data?: IDataSet, extend?: boolean) {
  data?.applyModelChange(() => {
    func()
  }, {
    notify: selectCasesNotification(data, extend)
  })
}

export function selectAllCases(data?: IDataSet, select = true) {
  selectWithNotification(() => data?.selectAll(select), data)
}

export function setSelectedCases(caseIds: string[], data?: IDataSet) {
  selectWithNotification(() => data?.setSelectedCases(caseIds), data)
}

export function selectCases(caseIds: string[], data?: IDataSet, select?: boolean) {
  selectWithNotification(() => data?.selectCases(caseIds, select), data, true)
}

export function setOrExtendSelection(caseIds: string[], data?: IDataSet, extend = false, select?: boolean) {
  if (extend) selectCases(caseIds, data, select)
  else setSelectedCases(caseIds, data)
}

export function selectAndDeselectCases(addCaseIds: string[], removeCaseIds: string[], data?: IDataSet) {
  selectWithNotification(() => {
    data?.selectCases(addCaseIds)
    data?.selectCases(removeCaseIds, false)
  }, data, true)
}

// Set aside helper functions

// For case ids, returns the grouped case. For item ids, returns the childmost grouped case containing that item.
function getGroupedCases(data: IDataSet, caseOrItemIds: string[]) {
  return caseOrItemIds.map(caseId => data.caseInfoMap.get(caseId) ?? data.itemIdChildCaseMap.get(caseId))
    .filter(caseInfo => !!caseInfo).map(caseInfo => caseInfo.groupedCase)
}

export function addSetAsideCases(data: IDataSet, caseOrItemIds: string[], undoable = true) {
  if (caseOrItemIds.length) {
    data.validateCases()
    data.applyModelChange(() => {
      data.hideCasesOrItems(caseOrItemIds)
      data.selectCases(caseOrItemIds, false)
    }, {
      notify:
        [selectCasesNotification(data, true), deleteCasesNotification(data, getGroupedCases(data, caseOrItemIds))],
      undoStringKey: undoable ? "V3.Undo.hideShowMenu.setAsideCases" : undefined,
      redoStringKey: undoable ? "V3.Redo.hideShowMenu.setAsideCases" : undefined
    })
  }
}

function createGuaranteedCasesNotification(data: IDataSet, caseOrItemIds: string[]) {
  const caseIds = caseOrItemIds
    .map(id => data.caseInfoMap.get(id) ? id : data.itemIdChildCaseMap.get(id)?.groupedCase.__id__)
    .filter(caseId => caseId != null)
  if (caseIds.length) return createCasesNotification(caseIds, data)
}

export function restoreSetAsideCases(data?: IDataSet, caseOrItemIds?: string[], undoable = true) {
  if (!data) return

  data.validateCases()
  const setAsideCaseOrItemIds =
    caseOrItemIds ? caseOrItemIds.filter(caseId => data.isCaseOrItemHidden(caseId)) : [...data.setAsideItemIds]
  const createNotification = createGuaranteedCasesNotification(data, setAsideCaseOrItemIds)
  const notifications: INotify = createNotification ? [createNotification] : []
  if (setAsideCaseOrItemIds.length) {
    data.applyModelChange(() => {
      data.showHiddenCasesAndItems(setAsideCaseOrItemIds)
      data.setSelectedCases(setAsideCaseOrItemIds)
    }, {
      notify: notifications.concat(selectCasesNotification(data)),
      undoStringKey: undoable ? "V3.Undo.hideShowMenu.restoreSetAsideCases" : undefined,
      redoStringKey: undoable ? "V3.Redo.hideShowMenu.restoreSetAsideCases" : undefined,
      log: "Restore set aside cases"
    })
  }
}

export function replaceSetAsideCases(data: IDataSet, caseOrItemIds: string[]) {
  if (caseOrItemIds.length) {
    data.validateCases()
    const itemIds: string[] = []
    caseOrItemIds.forEach(caseOrItemId => {
      const aCase = data.caseInfoMap.get(caseOrItemId)
      if (aCase) {
        aCase.childItemIds.forEach(itemId => itemIds.push(itemId))
        aCase.hiddenChildItemIds.forEach(itemId => itemIds.push(itemId))
      } else {
        itemIds.push(caseOrItemId)
      }
    })
    const itemIdSet = new Set(itemIds)
    const restoredItemIds = data.setAsideItemIds.filter(itemId => !itemIdSet.has(itemId))
    const setAsideCaseOrItemIds = caseOrItemIds.filter(caseId => !data.isCaseOrItemHidden(caseId))
    const setAsideCases = getGroupedCases(data, setAsideCaseOrItemIds)

    const createNotification = createGuaranteedCasesNotification(data, restoredItemIds)
    let notifications: INotify = createNotification ? [createNotification] : []
    if (setAsideCases.length) notifications = notifications.concat(deleteCasesNotification(data, setAsideCases))

    data.applyModelChange(() => {
      data.showHiddenCasesAndItems()
      data.validateCases()
      data.hideCasesOrItems(caseOrItemIds)
      data.setSelectedCases(restoredItemIds)
    }, {
      notify: notifications.concat(selectCasesNotification(data, true))
    })
  }
}

// Returns the next case of the given collection to select based on the current selection.
// Used by the case card to scroll through cases.
export function getNextCase(data: IDataSet, collection: ICollectionModel, caseId: string) {
  const indexInCollection = collection.getCaseIndex(caseId)

  const selectedCases = collection.cases.filter(c => data.isCaseLooselySelected(c.__id__))
  if (selectedCases.length === 1) {
    // When one case is selected, just return the next case
    if (indexInCollection != null && indexInCollection < collection.cases.length - 1) {
      return collection.getCaseGroup(collection.caseIds[indexInCollection + 1])?.groupedCase
    }
  } else {
    // If no cases are selected, return the first case
    if (selectedCases.length === 0) return collection?.cases[0]

    // Otherwise return the first case that is selected
    const nextCaseId = collection.caseIds.find(id => data.isCaseLooselySelected(id))
    if (nextCaseId) return collection.getCaseGroup(nextCaseId)?.groupedCase
  }
}

export function getPreviousCase(data: IDataSet, collection: ICollectionModel, caseId: string) {
  const indexInCollection = collection.getCaseIndex(caseId)

  const selectedCases = collection.cases.filter(c => data.isCaseLooselySelected(c.__id__))
  if (selectedCases.length === 1) {
    // When one case is selected, just return the previous case
    if (indexInCollection != null && indexInCollection > 0) {
      return collection.getCaseGroup(collection.caseIds[indexInCollection - 1])?.groupedCase
    }
  } else {
    // If no cases are selected, return the last case
    const lastCaseId = collection.caseIds[collection.caseIds.length - 1]
    const lastCase = lastCaseId ? collection.getCaseGroup(lastCaseId)?.groupedCase : undefined
    if (selectedCases.length === 0) return lastCase

    // Otherwise return the case before the first one that's selected
    const selectedCaseIndices = selectedCases.map(({ __id__ }) => collection.getCaseIndex(__id__))
      .filter(index => index != null && index >= 0) as number[]
    const lowestIndex = Math.min(...selectedCaseIndices)
    if (lowestIndex > 0) {
      return collection.getCaseGroup(collection.caseIds[lowestIndex - 1])?.groupedCase
    } else {
      // If the lowest index is 0, return the last case in the collection
      return lastCase
    }
  }
}
