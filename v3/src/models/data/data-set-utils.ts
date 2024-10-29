import { isAlive } from "mobx-state-tree"
import { kIndexColumnKey } from "../../components/case-tile-common/case-tile-types"
import { logMessageWithReplacement } from "../../lib/log-message"
import { AttributeFormulaAdapter } from "../formula/attribute-formula-adapter"
import { FilterFormulaAdapter } from "../formula/filter-formula-adapter"
import { getSharedCaseMetadataFromDataset } from "../shared/shared-data-utils"
import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { IDataSet } from "./data-set"
import {
  createCasesNotification, deleteCasesNotification, deleteCollectionNotification,
  moveAttributeNotification, selectCasesNotification
} from "./data-set-notifications"
import { IAttributeChangeResult, IMoveAttributeOptions } from "./data-set-types"

AttributeFormulaAdapter.register()
FilterFormulaAdapter.register()

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

/**
 * Returns the collection containing the attribute from the given array that is closest to the
 * root of the data set. If there is an attribute that is not in any collection, then we return undefined
 * indicating that the client should use the root as the source of cases.
 */
export function idOfChildmostCollectionForAttributes(attrIDs: string[], data?: IDataSet) {
  if (!data) return undefined
  const collections = data.collections
  for (let i = collections.length - 1; i >= 0; --i) {
    const collection = collections[i]
    if (collection.attributes.some(attr => attrIDs.includes(attr?.id ?? ""))) return collection.id
  }
}

export function firstVisibleParentAttribute(data?: IDataSet, collectionId?: string): IAttribute | undefined {
  if (!collectionId) return
  const metadata = data && getSharedCaseMetadataFromDataset(data)
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
    !afterAttrId || afterAttrId === kIndexColumnKey ? { before: firstAttr?.id } : { after: afterAttrId }

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

export function addSetAsideCases(data: IDataSet, caseIds: string[], undoable = true) {
  if (caseIds.length) {
    const cases = caseIds.map(caseId => data.caseInfoMap.get(caseId) ?? data.itemIdChildCaseMap.get(caseId))
      .filter(caseInfo => !!caseInfo).map(caseInfo => caseInfo.groupedCase)
    data.applyModelChange(() => {
      data.hideCasesOrItems(caseIds)
      data.selectCases(caseIds, false)
    }, {
      notify: [selectCasesNotification(data, false, cases), deleteCasesNotification(data, cases)],
      undoStringKey: undoable ? "V3.Undo.hideShowMenu.setAsideCases" : undefined,
      redoStringKey: undoable ? "V3.Redo.hideShowMenu.setAsideCases" : undefined
    })
  }
}

// createCasesNotifications must be created after the setAsides have been restored
// becaues the child cases are invisible until then
function _createCasesNotification(data: IDataSet, restoredItemIds: string[]) {
  return () => {
    data.validateCases()
    const hiddenCaseIds = restoredItemIds
      .filter(itemId => data.getItem(itemId) ? data.itemIdChildCaseMap.get(itemId) : itemId)
      .filter(caseId => !!caseId)
    return createCasesNotification(hiddenCaseIds, data)
  }
}

export function restoreSetAsideCases(data?: IDataSet, caseIds?: string[], undoable = true) {
  if (!data) return

  const hiddenItemIds = caseIds ? caseIds.filter(caseId => data.isCaseOrItemHidden(caseId)) : [...data.setAsideItemIds]
  if (hiddenItemIds.length) {
    data.applyModelChange(() => {
      data.showHiddenCasesAndItems(hiddenItemIds)
      data.setSelectedCases(hiddenItemIds)
    }, {
      notify: [_createCasesNotification(data, hiddenItemIds), selectCasesNotification(data)],
      undoStringKey: undoable ? "V3.Undo.hideShowMenu.restoreSetAsideCases" : undefined,
      redoStringKey: undoable ? "V3.Redo.hideShowMenu.restoreSetAsideCases" : undefined,
      log: "Restore set aside cases"
    })
  }
}

export function replaceSetAsideCases(data: IDataSet, caseIds: string[]) {
  if (caseIds.length) {
    const itemIds: string[] = []
    caseIds.forEach(caseId => {
      if (data.getItem(caseId)) {
        itemIds.push(caseId)
      } else {
        data.caseInfoMap.get(caseId)?.childItemIds.forEach(itemId => itemIds.push(itemId))
      }
    })
    const itemIdSet = new Set(itemIds)
    const restoredItemIds = data.setAsideItemIds.filter(itemId => !itemIdSet.has(itemId))
    const hiddenCaseIds = caseIds.filter(caseId => !data.isCaseOrItemHidden(caseId))
    const hiddenCases = hiddenCaseIds
      .map(caseId => data.caseInfoMap.get(caseId) ?? data.itemIdChildCaseMap.get(caseId))
      .filter(caseInfo => !!caseInfo).map(caseInfo => caseInfo.groupedCase)
    data.applyModelChange(() => {
      data.showHiddenCasesAndItems()
      data.hideCasesOrItems(caseIds)
      data.setSelectedCases(restoredItemIds)

    }, {
      notify: [
        _createCasesNotification(data, restoredItemIds),
        deleteCasesNotification(data, hiddenCases),
        selectCasesNotification(data, false, hiddenCases)
      ]
    })
  }
}
