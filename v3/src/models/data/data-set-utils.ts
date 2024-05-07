import { isAlive } from "mobx-state-tree"
import {IAttribute} from "./attribute"
import {ICollectionPropsModel, isCollectionModel} from "./collection"
import {IDataSet} from "./data-set"
import { selectCasesNotification } from "./data-set-notifications"

export function getCollectionAttrs(collection: ICollectionPropsModel, data?: IDataSet) {
  if (collection && !isAlive(collection)) {
    console.warn("DataSetUtils.getCollectionAttrs called for defunct collection")
    return []
  }
  return (isCollectionModel(collection)
    ? Array.from(collection.attributes) as IAttribute[]
    : data?.ungroupedAttributes) ?? []
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
  if (data.ungroupedAttributes.some(attr => attrIDs.includes(attr.id))) return undefined
  const collections = data.collections
  for (let i = collections.length - 1; i >= 0; --i) {
    const collection = collections[i]
    if (collection.attributes.some(attr => attrIDs.includes(attr?.id ?? ""))) return collection.id
  }
}

function selectWithNotification(func: () => void, data?: IDataSet, extend?: boolean) {
  data?.applyModelChange(() => {
    func()
  }, {
    notifications: selectCasesNotification(data, extend)
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
