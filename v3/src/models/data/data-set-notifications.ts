import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"
import { convertAttributeToV2, convertCaseToV2FullCase } from "../../data-interactive/data-interactive-type-utils"
import { INCOMPLETE_SELECT_CASES_NOTIFICATION_RESULT } from "../../data-interactive/data-interactive-types"
import { IAttribute } from "./attribute"
import { IDataSet } from "./data-set"
import { ICase } from "./data-set-types"
import { ICollectionModel, ICollectionPropsModel } from "./collection"

const action = "notify"
function makeCallback(operation: string, other?: any) {
  return (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation} ${other ?? ""}`, JSON.stringify(response))
}

function notification(operation: string, result: any, dataSet?: IDataSet, _callback?: (result: any) => void) {
  const resource = `dataContextChangeNotice[${dataSet?.name}]`
  const values = { operation, result }
  const callback = _callback ?? makeCallback(operation)
  return { message: { action, resource, values }, callback }
}

export function createCollectionNotification(collection: ICollectionModel, dataSet?: IDataSet) {
  const result = {
    success: true,
    collection: collection.id,
    name: collection.name,
    attribute: collection.attributes[0]?.name
  }
  return notification("createCollection", result, dataSet)
}

export function deleteCollectionNotification(dataSet?: IDataSet) {
  const result = { success: true }
  return notification("deleteCollection", result, dataSet)
}

export function updateCollectionNotification(collection?: ICollectionPropsModel, dataSet?: IDataSet) {
  const result = { success: true, properties: { name: collection?.name } }
  return notification("updateCollection", result, dataSet)
}

function attributeNotification(
  operation: string, data?: IDataSet, attrIDs?: string[], attrs?: IAttribute[]
) {
  const result = {
    success: true,
    attrs: attrs?.map(attr => convertAttributeToV2(attr, data)),
    attrIDs
  }
  return notification(operation, result, data, makeCallback(operation, attrIDs))
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
  const caseIDs = cases?.map(c => c.__id__)
  const result = {
    success: true,
    caseIDs,
    cases: cases?.map(c => convertCaseToV2FullCase(c, data))
  }
  return notification("updateCases", result, data)
}

export function selectCasesNotification(dataset: IDataSet) {
  return () => notification("selectCases", INCOMPLETE_SELECT_CASES_NOTIFICATION_RESULT, dataset)
}
