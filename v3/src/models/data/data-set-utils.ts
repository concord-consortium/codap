import {IAttribute} from "./attribute"
import {ICollectionPropsModel, isCollectionModel} from "./collection"
import {IDataSet} from "./data-set"

export function getCollectionAttrs(collection: ICollectionPropsModel, data?: IDataSet) {
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
