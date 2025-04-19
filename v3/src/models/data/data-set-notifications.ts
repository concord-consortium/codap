import { makeCallback, notification } from "../../data-interactive/notification-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { getMetadataFromDataSet } from "../shared/shared-data-utils"
import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { IDataSet } from "./data-set"
import { getDataSetNotificationAdapter } from "./data-set-notification-adapter"
import { ICase } from "./data-set-types"

function dataSetNotification(
  operation: string, result?: any, dataSet?: IDataSet, callback?: (result: any) => void,
  extraValues?: Record<string, any>
) {
  const resource = dataSet ? `dataContextChangeNotice[${dataSet.name}]` : `documentChangeNotice`
  const values = { operation, result, ...extraValues }

  return notification(resource, values, callback)
}

export const dataContextCountChangedNotification = dataSetNotification("dataContextCountChanged")

export function dataContextDeletedNotification(dataSet: IDataSet) {
  return dataSetNotification("dataContextDeleted", undefined, undefined, undefined, { deletedContext: dataSet.name })
}

export function updateDataContextNotification(dataSet: IDataSet) {
  const metadata = getMetadataFromDataSet(dataSet)
  const result = {
    success: true,
    properties: {
      description: metadata?.description ?? "",
      importDate: metadata?.importDate ?? "",
      name: dataSet.name,
      sourceName: metadata?.source ?? "",
      title: dataSet._title
    }
  }
  return dataSetNotification("updateDataContext", result, dataSet)
}

export function createCollectionNotification(collection: ICollectionModel, dataSet?: IDataSet) {
  const result = {
    success: true,
    collection: toV2Id(collection.id),
    name: collection.name,
    attribute: collection.attributes[0]?.name
  }
  return dataSetNotification("createCollection", result, dataSet)
}

export function deleteCollectionNotification(dataSet?: IDataSet) {
  const result = { success: true }
  return dataSetNotification("deleteCollection", result, dataSet)
}

export function updateCollectionNotification(collection?: ICollectionModel, dataSet?: IDataSet) {
  const result = { success: true, properties: { name: collection?.name } }
  return dataSetNotification("updateCollection", result, dataSet)
}

function attributeNotification(
  operation: string, data?: IDataSet, attrIDs?: string[], attrs?: IAttribute[]
) {
  const adapter = getDataSetNotificationAdapter()
  const result = {
    success: true,
    attrs: attrs?.map(attr => adapter.convertAttribute(attr, data)),
    attrIDs: attrIDs?.map(attrID => toV2Id(attrID))
  }
  return dataSetNotification(operation, result, data, makeCallback(operation, attrIDs))
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

export function createCasesNotification(caseIDs: string[], data?: IDataSet) {
  const caseID = caseIDs.length > 0 ? toV2Id(caseIDs[0]) : undefined
  let itemIDs: number[] = []
  caseIDs.forEach(caseId => {
    const aCase = data?.caseInfoMap.get(caseId)
    if (aCase) {
      itemIDs = itemIDs.concat(aCase.childItemIds.concat(aCase.hiddenChildItemIds).map(itemId => toV2Id(itemId)))
    }
  })
  const itemID = itemIDs.length > 0 ? itemIDs[0] : undefined
  const result = {
    success: true,
    caseIDs: caseIDs ? caseIDs.map(caseId => toV2Id(caseId)) : [],
    itemIDs,
    caseID,
    itemID
  }
  return dataSetNotification("createCases", result, data)
}

export function moveCasesNotification(data: IDataSet, cases: ICase[] = []) {
  const result = {
    success: true,
    caseIDs: cases.map(aCase => toV2Id(aCase.__id__))
  }
  return dataSetNotification("moveCases", result, data)
}

export function updateCasesNotification(data: IDataSet, cases?: ICase[]) {
  const adapter = getDataSetNotificationAdapter()
  const caseIDs = cases?.map(c => toV2Id(c.__id__))
  const result = {
    success: true,
    caseIDs,
    cases: cases?.map(c => adapter.convertCase(c, data))
  }
  return dataSetNotification("updateCases", result, data)
}

export function updateCasesNotificationFromIds(data: IDataSet, caseIds?: string[]) {
  data.validateCases()
  const cases = caseIds?.map(caseId => data.caseInfoMap.get(caseId))
    .filter(caseGroup => !!caseGroup)
    .map(caseGroup => caseGroup.groupedCase)
  return updateCasesNotification(data, cases)
}

export function deleteCasesNotification(data: IDataSet, cases?: ICase[]) {
  const adapter = getDataSetNotificationAdapter()
  const result = {
    success: true,
    cases: cases?.map(c => adapter.convertCase(c, data))
  }
  return dataSetNotification("deleteCases", result, data)
}

// selectCasesNotification returns a function that will later be called to determine if the selection
// actually changed and a notification is necessary to broadcast
export function selectCasesNotification(dataset: IDataSet, extend?: boolean) {
  const getSelectedCaseIds = (selectedItemIds: Set<string>) => {
    const caseIds: string[] = []
    Array.from(dataset.caseInfoMap.values()).forEach(aCase => {
      if (aCase.childItemIds.length && aCase.childItemIds.every(itemId => selectedItemIds.has(itemId))) {
        caseIds.push(aCase.groupedCase.__id__)
      }
    })
    return caseIds
  }
  const oldSelectedItemIds = Array.from(dataset.selection)
  const oldSelectedItemIdSet = new Set(oldSelectedItemIds)
  const oldSelectedCaseIds = getSelectedCaseIds(oldSelectedItemIdSet)
  const oldSelectedCaseIdSet = new Set(oldSelectedCaseIds)

  const adapter = getDataSetNotificationAdapter()

  return () => {
    const newSelectedItemIds = Array.from(dataset.selection)
    const newSelectedItemIdSet = new Set(newSelectedItemIds)
    const newSelectedCaseIds = getSelectedCaseIds(newSelectedItemIdSet)
    const newSelectedCaseIdSet = new Set(newSelectedCaseIds)
    const addedCaseIds = newSelectedCaseIds.filter(caseId => !oldSelectedCaseIdSet.has(caseId))
    const removedCaseIds = oldSelectedCaseIds.filter(caseId => !newSelectedCaseIdSet.has(caseId))

    // Only send a notification if the selection has actually changed
    if (addedCaseIds.length === 0 && removedCaseIds.length === 0) return

    const convertCaseIdsToV2FullCases = (_caseIds: string[]) => {
      const caseGroups = _caseIds.map(caseId => dataset.caseInfoMap.get(caseId)?.groupedCase).filter(c => !!c)
      return caseGroups.map(groupedCase => adapter.convertCase(groupedCase, dataset))
    }

    const caseIds = extend ? addedCaseIds : newSelectedCaseIds
    const _cases = convertCaseIdsToV2FullCases(caseIds)
    const cases = extend
      ? _cases.length > 0 ? _cases : undefined
      : _cases
    const removedCases = extend && removedCaseIds.length > 0
      ? convertCaseIdsToV2FullCases(removedCaseIds) : []
    const result = { success: true, cases, removedCases, extend: !!extend }
    return dataSetNotification("selectCases", result, dataset)
  }
}
