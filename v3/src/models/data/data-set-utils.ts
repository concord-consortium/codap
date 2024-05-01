import { isAlive } from "mobx-state-tree"
import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"
import {IAttribute} from "./attribute"
import {ICollectionPropsModel, isCollectionModel} from "./collection"
import {IDataSet} from "./data-set"
import { convertAttributeToV2, convertCaseToV2FullCase } from "../../data-interactive/data-interactive-type-utils"
import { ICase } from "./data-set-types"

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

function attributeNotification(
  operation: string, data?: IDataSet, attrIDs?: string[], attrs?: IAttribute[]
) {
  const action = "notify"
  const resource = `dataContextChangeNotice[${data?.name}]`
  const values = {
    operation,
    result: {
      success: true,
      attrs: attrs?.map(attr => convertAttributeToV2(attr, data)),
      attrIDs
    }
  }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation} ${attrIDs ?? ""}`, JSON.stringify(response))
  }
}

export function createAttributesNotification(attrs: IAttribute[], data?: IDataSet) {
  return attributeNotification("createAttributes", data, attrs.map(attr => attr.id), attrs)
}

export function hideAttributeNotification(attrIDs: string[], data?: IDataSet, operation: string = "hideAttributes") {
  return attributeNotification(operation, data, attrIDs)
}

export function moveAttributeNotification(data?: IDataSet) {
  return attributeNotification("moveAttribute", data)
}

export function removeAttributesNotification(attrIDs: string[], data?: IDataSet) {
  return attributeNotification("deleteAttributes", data, attrIDs)
}

export function updateAttributesNotification(attrs: IAttribute[], data?: IDataSet) {
  return attributeNotification("updateAttributes", data, attrs.map(attr => attr.id), attrs)
}

export function updateCasesNotification(data: IDataSet, cases?: ICase[]) {
  const action = "notify"
  const resource = `dataContextChangeNotice[${data?.name}]`
  const operation = "updateCases"
  const caseIDs = cases?.map(c => c.__id__)
  const values = {
    operation,
    result: {
      success: true,
      caseIDs,
      cases: cases?.map(c => convertCaseToV2FullCase(c, data))
    }
  }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation}`, JSON.stringify(response))
  }
}
