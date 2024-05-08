import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"
import { convertAttributeToV2, convertCaseToV2FullCase } from "../../data-interactive/data-interactive-type-utils"
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

export function updateDataContextNotification(dataSet: IDataSet) {
  const result = {
    success: true,
    properties: {
      description: dataSet.description,
      importDate: dataSet.importDate,
      name: dataSet.name,
      sourceName: dataSet.sourceName,
      title: dataSet._title
    }
  }
  return notification("updateDataContext", result, dataSet)
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

// selectCasesNotificaiton returns a function that will later be called to determine if the selection
// actually changed and a notification is necessary to broadcast
export function selectCasesNotification(dataset: IDataSet, extend?: boolean) {
  const oldSelection = Array.from(dataset.selection)
  const oldSelectionSet = new Set(oldSelection)
  
  return () => {
    const newSelection = Array.from(dataset.selection)
    const newSelectionSet = new Set(newSelection)
    const addedCaseIds = newSelection.filter(caseId => !oldSelectionSet.has(caseId))
    const removedCaseIds = oldSelection.filter(caseId => !newSelectionSet.has(caseId))

    // Only send a notification if the selection has actually changed
    if (addedCaseIds.length === 0 && removedCaseIds.length === 0) return

    const convertCaseIdsToV2FullCases = (caseIds: string[]) => {
      return caseIds.map(caseId => {
        const c = dataset.getCase(caseId)
        return c && convertCaseToV2FullCase(c, dataset)
      }).filter(c => !!c)
    }
    const _cases = convertCaseIdsToV2FullCases(extend ? addedCaseIds : newSelection)
    const cases = extend
      ? _cases.length > 0 ? _cases : undefined
      : _cases
    const removedCases = extend && removedCaseIds.length > 0
      ? convertCaseIdsToV2FullCases(removedCaseIds) : undefined
    const result = { success: true, cases, removedCases, extend: !!extend }
    return notification("selectCases", result, dataset)
  }
}
