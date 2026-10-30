import {
  createCasesNotification, deleteCasesNotification, updateCasesNotificationFromIds
} from "../../models/data/data-set-notifications"
import { getGroupedCases } from "../../models/data/data-set-utils"
import { ICase } from "../../models/data/data-set-types"
import { toV2Id, toV3CaseId, toV3ItemId } from "../../utilities/codap-utils"
import { DIResources, DISuccessResult, DIValues } from "../data-interactive-types"
import { DICaseValues, DIFullCase, DIUpdateCase, DIUpdateItemResult } from "../data-interactive-data-set-types"
import { getV2ItemResult, getCaseRequestResultValues } from "../data-interactive-type-utils"
import { attrNamesToIds } from "../data-interactive-utils"
import {
  caseNotFoundResult, dataContextNotFoundResult, fieldRequiredResult, itemNotFoundResult, valuesRequiredResult
} from "./di-results"

export function deleteCaseBy(resources: DIResources, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  const pseudoCase = dataContext.caseInfoMap.get(aCase.__id__)
  const caseIds = pseudoCase?.childItemIds ?? [aCase.__id__]

  dataContext.applyModelChange(() => {
    dataContext.removeCases(caseIds)
  }, {
    notify: deleteCasesNotification(dataContext, getGroupedCases(dataContext, [aCase.__id__]))
  })

  return { success: true as const, values: [toV2Id(aCase.__id__)] }
}

export function deleteItem(resources: DIResources, item?: ICase | string[]) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!item) return itemNotFoundResult

  const itemIds = Array.isArray(item) ? item : [item.__id__]
  dataContext.applyModelChange(() => {
    dataContext.removeCases(itemIds)
  }, {
    notify: deleteCasesNotification(dataContext, getGroupedCases(dataContext, itemIds))
  })

  return { success: true as const, values: itemIds.map(itemId => toV2Id(itemId)) }
}

export function getCaseBy(resources: DIResources, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  return { success: true as const, values: getCaseRequestResultValues(aCase, dataContext) }
}

export function getItem(resources: DIResources, item?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!item) return itemNotFoundResult

  return { success: true as const, values: getV2ItemResult(dataContext, item.__id__) }
}

function itemResult({ changedCases, createdCases, deletedCases }: DIUpdateItemResult) {
  return {
    success: true,
    values: {
      changedCases: changedCases ?? [],
      createdCases: createdCases ?? [],
      deletedCases: deletedCases ?? []
    }
  } as DISuccessResult
}

export interface IUpdateCaseByOptions {
  itemReturnStyle?: boolean
  nestedValues?: boolean // Case requests expect values: { values: { ... } }
  resourceName?: string
}
export function updateCaseBy(
  resources: DIResources, values?: DIValues, aCase?: ICase, options?: IUpdateCaseByOptions
) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  const { itemReturnStyle, nestedValues, resourceName } = options ?? {}

  const missingFieldResult = (field: string) => fieldRequiredResult("update", resourceName ?? "case", field)
  if (!values) return missingFieldResult("values")

  let _values = values as DICaseValues
  if (nestedValues) {
    const updateCase = values as DIUpdateCase
    if (!updateCase.values) return missingFieldResult("values.values")
    _values = updateCase.values
  }

  const updatedAttributes = attrNamesToIds(_values, dataContext)
  const hasUpdates = Object.keys(updatedAttributes).length > 0
  dataContext.validateCases()
  const priorCaseIds = new Set(dataContext.caseInfoMap.keys())
  dataContext.applyModelChange(() => {
    dataContext.setCaseValues([{ ...updatedAttributes, __id__: aCase.__id__ }])
  }, {
    // as the case table does, report the changed case and any cases the change created by regrouping
    notify: () => {
      if (!hasUpdates) return
      // an item is reported as the childmost case containing it
      const caseIds = getGroupedCases(dataContext, [aCase.__id__]).map(({ __id__ }) => __id__)
      const newCaseIds = Array.from(dataContext.caseInfoMap.keys()).filter(caseId => !priorCaseIds.has(caseId))
      const notifications = []
      if (caseIds.length > 0) notifications.push(updateCasesNotificationFromIds(dataContext, caseIds))
      if (newCaseIds.length > 0) notifications.push(createCasesNotification(newCaseIds, dataContext))
      return notifications
    }
  })

  if (itemReturnStyle) return itemResult({ changedCases: [toV2Id(aCase.__id__)] })

  return { success: true }
}

export function updateCasesBy(resources: DIResources, values?: DIValues, itemReturnStyle?: boolean) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!values) return valuesRequiredResult

  const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
  const caseIDs: number[] = []
  const updatedCases: ICase[] = []
  dataContext.applyModelChange(() => {
    cases.forEach(aCase => {
      const { id } = aCase
      const v3CaseId = id ? toV3CaseId(id) : undefined
      const v3ItemId = id ? toV3ItemId(id) : undefined
      const dcCase = v3CaseId ? dataContext.caseInfoMap.get(v3CaseId) : undefined
      const dcItem = v3ItemId ? dataContext.getItem(v3ItemId) : undefined
      const v3Id = dcCase ? v3CaseId : v3ItemId
      if (id && aCase.values && v3Id && (dcItem || dcCase)) {
        caseIDs.push(id)
        const updatedAttributes = attrNamesToIds(aCase.values, dataContext)
        updatedCases.push({ ...updatedAttributes, __id__: v3Id })
      }
    })
    dataContext.setCaseValues(updatedCases)
  }, {
    notify: () => {
      if (caseIDs.length > 0) {
        return updateCasesNotificationFromIds(dataContext, caseIDs.map(caseId => toV3CaseId(caseId)))
      }
    }
  })

  if (caseIDs.length > 0) {
    if (itemReturnStyle) return itemResult({ changedCases: caseIDs })

    return { success: true, caseIDs }
  }

  return { success: false }
}
